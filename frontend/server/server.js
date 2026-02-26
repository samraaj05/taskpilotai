require('dotenv').config();
process.env.DISABLE_EMAIL = "true";
console.log("ENV LOADED:", !!process.env.SMTP_USER);

const isProduction = process.env.NODE_ENV === 'production';
// Cold Start Optimization: Preload essential modules
const path = require('path');
const http = require('http');
const mongoose = require('mongoose');

const dotenv = require('dotenv').config({
    path: isProduction ? '.env.production' : '.env'
});
const express = require('express');
const logger = require('./src/utils/logger');

// --- Global Crash Protection ---
process.on('uncaughtException', (err) => {
    logger.error(`✖ Critical system error detected (uncaughtException): ${err.message}`);
    if (err.stack) logger.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('✖ Critical system error detected (unhandledRejection):', { reason });
});

const cors = require('cors');

const helmet = require('helmet');
const requestLogger = require('./src/middleware/requestLogger');
const compression = require('compression');
// Deferred: const { initWorkers } = require('./src/queue/worker');
// Deferred: const { overdueQueue } = require('./src/queue/queue');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./src/middleware/errorMiddleware');
const { connectDB, closeDB } = require('./src/config/db');
const { observabilityMiddleware } = require('./src/middleware/observabilityMiddleware');
const seedData = require('./src/config/seed');
// BullMQ Workers are initialized by the import above


const { initIO } = require('./src/socket');

const port = process.env.PORT || 10000;
// isProduction already defined at top

// --- Environment Validation ---
const requiredEnv = ['JWT_SECRET', 'PORT', 'MONGO_URI', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
    if (isProduction) {
        logger.error(`✖ MISSING REQUIRED ENV VARS: ${missingEnv.join(', ')}. Server may malfunction.`);
    } else {
        logger.warn(`⚠ Missing environment variables in development: ${missingEnv.join(', ')}`);
    }
}

// Warm up DB connection earlier if possible
connectDB();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && isProduction) {
    logger.error('✖ CRITICAL: JWT_SECRET is missing in production. Authentication is insecure.');
}

console.log("SMTP CONFIG CHECK:", {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    userExists: !!process.env.SMTP_USER,
    passExists: !!process.env.SMTP_PASS
});

const app = express();
const server = http.createServer(app);

const startServer = async () => {
    try {
        // Phase 1, 2: Observability & Performance
        app.use(observabilityMiddleware);

        // Initial logging
        logger.info(`--- TaskPilot Backend: Startup [Mode: ${process.env.NODE_ENV || 'development'}] ---`);

        await connectDB();
        logger.info('✔ Database connection established');

        // Email System Validation
        const { validateSMTPConfig } = require('./src/utils/emailService');
        const missingSmtp = validateSMTPConfig();
        if (missingSmtp.length > 0) {
            logger.warn(`⚠ Email system starting in DEGRADED mode (missing: ${missingSmtp.join(', ')})`);
        } else {
            logger.info('✔ Email system initialized');
        }

        // Initialize Background Workers & Periodic Jobs (Non-blocking)
        try {
            // Chaos Simulation Middleware (Optional)
            if (process.env.CHAOS_MODE === 'true') {
                app.use((req, res, next) => {
                    const random = Math.random();
                    if (random < 0.02 && req.originalUrl.includes('/api/')) {
                        logger.warn(`⚠ Chaos simulation: Artificial failure triggered for ${req.originalUrl}`);
                        return res.status(503).json({ success: false, message: "Synthetic Chaos Failure" });
                    }
                    if (random < 0.05) {
                        const spike = Math.floor(Math.random() * 2000) + 1000;
                        logger.warn(`⚠ Chaos simulation: Latency spike of ${spike}ms triggered`);
                        return setTimeout(next, spike);
                    }
                    next();
                });
                logger.info('--- 🔥 CHAOS MODE ACTIVE: Artificial failures & latency enabled ---');
            }

            if (process.env.ENABLE_WORKER === 'true') {
                const { initWorkers } = require('./src/queue/worker');
                const { overdueQueue } = require('./src/queue/queue');

                initWorkers();
                // Use a short timeout for queue operations to prevent boot hang if Redis is down
                Promise.race([
                    overdueQueue.add('periodic_overdue_scan', {}, {
                        repeat: { pattern: '0 * * * *' } // Every hour
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Queue timeout (Redis unreachable)')), 2000))
                ]).then(() => {
                    logger.info('--- Background Services Initialized ---');
                }).catch(queueError => {
                    logger.warn('--- ⚠ Background Services partially started (Redis degraded/missing). API-ONLY mode enabled. ---', { error: queueError.message });
                });
            } else {
                logger.info('--- Mode: API-ONLY (Background Services Disabled) ---');
            }
        } catch (queueError) {
            logger.warn('--- ⚠ Background Services failed — Mode: API-ONLY ---', { error: queueError.message });
        }

        // Only seed data in development
        if (!isProduction) {
            try {
                await seedData();
                logger.info('--- Data Seeding Completed ---');
            } catch (seedError) {
                logger.error(`--- ⚠ Data Seeding Failed: ${seedError.message} ---`);
            }
        }

        // Performance & Proxy
        app.use(compression());
        app.set('trust proxy', 1);

        // --- Workers already initialized lazily above if ENABLE_WORKER=true ---

        // --- Security Middlewares ---
        app.use(helmet({
            contentSecurityPolicy: false, // Disable CSP for easier dev/initial prod setup, can be hardened later
        }));

        // Trust first proxy (required for Railway/Render)
        app.set('trust proxy', 1);

        // Rate Limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // Limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again after 15 minutes',
            standardHeaders: true,
            legacyHeaders: false,
        });

        // Apply rate limiter to all /api routes
        app.use('/api', limiter);

        // Global Request Timeout (15s)
        app.use((req, res, next) => {
            res.setTimeout(15000, () => {
                if (!res.headersSent) {
                    res.status(503).json({ success: false, message: "Request timeout" });
                }
            });
            next();
        });

        // Middlewares
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:5173',
            /\.vercel\.app$/ // Allow all Vercel subdomains
        ];

        app.use(cors({
            origin: function (origin, callback) {
                // allow requests with no origin (like mobile apps or curl requests)
                if (!origin) return callback(null, true);

                const isAllowed = allowedOrigins.some(pattern => {
                    if (pattern instanceof RegExp) return pattern.test(origin);
                    return pattern === origin;
                });

                if (isAllowed) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        }));
        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));
        app.use(cookieParser());
        app.use(requestLogger);

        // Routes
        // API Routes
        app.use('/api/auth', require('./src/routes/userRoutes'));
        app.use('/api/users', require('./src/routes/userRoutes'));
        app.use('/api/projects', require('./src/routes/projectRoutes'));
        app.use('/api/tasks', require('./src/routes/taskRoutes'));
        app.use('/api/team', require('./src/routes/teamRoutes'));
        app.use('/api/ai-insights', require('./src/routes/aiRoutes'));
        app.use('/api/activity', require('./src/routes/activityRoutes'));
        app.use('/api/analytics', require('./src/routes/analyticsRoutes'));
        app.use('/api/ai', require('./src/routes/ai.routes'));
        app.use('/api/invite', require('./src/routes/inviteRoutes'));
        app.use('/health', require('./src/routes/systemRoutes'));

        // Serve static assets in production (DISABLED for API-only mode)
        /*
        const distPath = path.join(__dirname, 'dist');
        app.use(express.static(distPath));

        // Catch-all route for React
        app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
        */

        // Error Handler
        app.use(errorHandler);

        // Graceful Shutdown Handler
        const gracefulShutdown = async (signal) => {
            logger.info(`--- ${signal} received: Graceful shutdown initiated ---`);

            // 1. Terminate server
            server.close(async () => {
                logger.info('✔ HTTP Server closed');

                // 2. Terminate Redis (ioredis)
                const redis = require('./src/config/redis');
                await redis.quit();
                logger.info('✔ Redis connection closed');

                // 3. Terminate Database
                await closeDB();

                process.exit(0);
            });

            // Fallback timeout
            setTimeout(() => {
                logger.error('✖ Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        return new Promise((resolve) => {
            server.listen(port, () => {
                logger.info(`🚀 Server running on port ${port}`);

                // Phase 4: Periodic System Resource Monitoring
                setInterval(() => {
                    const memory = process.memoryUsage();
                    const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
                    const heapTotalMB = Math.round(memory.heapTotal / 1024 / 1024);
                    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

                    const metrics = {
                        rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
                        heapUsed: `${heapUsedMB}MB`,
                        heapTotal: `${heapTotalMB}MB`,
                        uptime: `${Math.floor(process.uptime())}s`
                    };

                    if (usagePercent > 80) {
                        logger.warn('⚠ High memory usage detected', metrics);
                    } else {
                        logger.info('📊 System resources periodic check', metrics);
                    }
                }, 60000); // Every 60 seconds

                resolve(server);
            });
        });

    } catch (error) {
        logger.error(`❌ Server core startup failed: ${error.message}`);
        // Only exit if the HTTP server fails to bind or the database strictly refuses to connect.
        // Process will stay alive for API interactions otherwise.
        if (error.code === 'EADDRINUSE') {
            process.exit(1);
        }
    }
};

if (process.env.NODE_ENV !== 'test') {
    startServer();
}

module.exports = { app, server, startServer };
