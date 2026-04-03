require('dotenv').config();
const logger = require('./src/utils/logger');
logger.info(`ENV LOADED: ${process.env.SMTP_USER ? 'true' : 'false'}`);

const isProduction = process.env.NODE_ENV === 'production';
// Cold Start Optimization: Preload essential modules
const path = require('path');
const http = require('http');
const mongoose = require('mongoose');

logger.info(`DISABLE_EMAIL VALUE: ${process.env.DISABLE_EMAIL}`);
logger.info(`JWT_SECRET loaded: ${process.env.JWT_SECRET ? 'true' : 'false'}`);

const express = require('express');
// Removed duplicate logger require here as it's now at the top

// --- Global Crash Protection (Stabilization Mode) ---
process.on('uncaughtException', (err) => {
    console.error(`✖ System error intercepted (uncaughtException): ${err.message}`);
    if (err.stack) console.error(err.stack);
    // Safe mode: Prevent crash
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('✖ System error intercepted (unhandledRejection):', reason);
    // Safe mode: Prevent crash
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

const port = process.env.PORT || 5005;
// isProduction already defined at top

// --- Environment Validation (Startup Guard) ---
const requiredEnv = ['JWT_SECRET', 'PORT', 'MONGO_URI', 'REDIS_HOST', 'FRONTEND_URL'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
    const errorMsg = `✖ CRITICAL ERROR: Missing required environment variables: ${missingEnv.join(', ')}`;
    logger.error(errorMsg);
    if (isProduction) {
        process.exit(1); // Force shutdown in production if config is incomplete
    } else {
        logger.warn('⚠ Continuing in development mode with missing env vars. Some features will fail.');
    }
}

// Warm up DB connection earlier if possible
connectDB();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && isProduction) {
    logger.error('✖ CRITICAL: JWT_SECRET is missing in production. Authentication is insecure.');
}

logger.info("SMTP CONFIG CHECK", {
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

        console.log('--- DEBUG: Email validation start ---');
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
            if (process.env.ENABLE_WORKER === 'true' || isProduction) {
                const redis = require('./src/config/redis');
                const { initWorkers } = require('./src/queue/worker');
                const { overdueQueue } = require('./src/queue/queue');

                initWorkers();
                
                // Non-blocking initialization of queues
                overdueQueue.add('periodic_overdue_scan', {}, {
                    repeat: { pattern: '0 * * * *' } // Every hour
                }).then(() => {
                    logger.info('--- 🚀 Background Services Initialized (FULL MODE) ---');
                }).catch(queueError => {
                    logger.warn('--- ⚠ Background Services pending (Redis fallback). Backend running in Standard Mode. ---');
                });
            } else {
                logger.info('--- Mode: API-ONLY (Background Services Disabled) ---');
            }
        } catch (queueError) {
            logger.warn('--- ⚠ Background Services failed — Mode: API-ONLY ---', { error: queueError.message });
        }

        // --- MINIMAL STARTUP CHECK ---
        const Workspace = require('./src/models/Workspace');
        const workspaceCount = await Workspace.countDocuments();

        if (workspaceCount === 0 && !isProduction) {
            try {
                const seedMinimal = require('./seed_minimal');
                logger.info('--- [STARTUP] TRIGGERING MINIMAL DEMO SEEDING ---');
                await seedMinimal();
                logger.info('--- [STARTUP] Minimal Demo Seeding Completed ---');
            } catch (seedError) {
                logger.error(`--- [STARTUP] ⚠ Minimal Seeding Failed: ${seedError.message} ---`);
            }
        } else {
            logger.info(isProduction ? '--- [STARTUP] Production Mode: Auto-seeding disabled ---' : '--- [STARTUP] Workspaces exist. Skipping Auto-Seed. ---');
        }

        // Performance & Proxy
        app.use(compression());
        app.set('trust proxy', 1);

        // --- Workers already initialized lazily above if ENABLE_WORKER=true ---

        // --- Security Middlewares ---
        app.use(helmet({
            contentSecurityPolicy: isProduction ? {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    imgSrc: ["'self'", "data:", "https:", "http://127.0.0.1"],
                    connectSrc: ["'self'", "http://localhost:5005", "ws://localhost:5005", "https://*.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'self'", "https://accounts.google.com"],
                },
            } : false,
        }));

        // Rate Limiting
        const apiLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 200, // Limit each IP to 200 requests per 15 mins
            message: { success: false, message: 'Too many requests, please try again later.' },
            standardHeaders: true,
            legacyHeaders: false,
        });

        const authLimiter = rateLimit({
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 10, // Limit each IP to 10 login attempts per hour
            message: { success: false, message: 'Too many login attempts, please try again later.' },
            standardHeaders: true,
            legacyHeaders: false,
        });

        // Apply rate limiter to all /api routes
        app.use('/api', apiLimiter);
        app.use('/api/auth/login', authLimiter);

        // Global Request Timeout (30s)
        app.use((req, res, next) => {
            res.setTimeout(30000, () => {
                try {
                    if (!res.headersSent) {
                        res.status(503).json({ success: false, message: "Request timeout" });
                    }
                } catch (err) {
                    console.error("Timeout response already sent");
                }
            });
            next();
        });

        // Middlewares
        app.use((req, res, next) => {
            const start = Date.now();
            res.on('finish', () => {
                const duration = Date.now() - start;
                logger.info(`[REQUEST] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
            });
            next();
        });
        const envOrigins = process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [];
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5174',
            /\.vercel\.app$/, // Allow Vercel
            /\.railway\.app$/, // Allow Railway
            ...envOrigins
        ].filter(Boolean);

        app.use(cors({
            origin: function (origin, callback) {
                // allow requests with no origin (like mobile apps or curl requests)
                if (!origin) return callback(null, true);

                const isAllowed = allowedOrigins.some(pattern => {
                    if (pattern instanceof RegExp) return pattern.test(origin);
                    return pattern === origin;
                });

                if (isAllowed || !isProduction) {
                    callback(null, true);
                } else {
                    logger.warn(`⚠ CORS blocked origin: ${origin}`);
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        }));
        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));
        app.use(cookieParser());
        app.use(requestLogger);

        // API Routes
        app.use('/health', require('./src/routes/systemRoutes'));

        // API Health
        app.get("/api/health", (req, res) => {
            const mongoose = require('mongoose');
            const redis = require('./src/config/redis');
            res.json({
                status: "healthy",
                mongodb: mongoose.connection.readyState === 1,
                redis: redis.status === 'ready',
                timestamp: new Date()
            });
        });

        // Test Mail Route (Diagnostic)
        app.get("/test-mail", async (req, res) => {
            try {
                const { transporter } = require('./src/utils/mailer');
                await transporter.sendMail({
                    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
                    to: "sammarimuthu7@gmail.com",
                    subject: "Test Mail",
                    text: "Hello from TaskPilot 🚀",
                });
                res.send("Mail sent!");
            } catch (err) {
                console.error("Diagnostic Mail Error:", err);
                res.send(`Mail failed: ${err.message}`);
            }
        });

        // Detailed Production Health Monitor
        app.get("/api/health/full", async (req, res) => {
            const mongoose = require('mongoose');
            const redis = require('./src/config/redis');
            const { getIO } = require('./src/socket');

            const stats = {
                status: "healthy",
                uptime: `${Math.floor(process.uptime())}s`,
                timestamp: new Date(),
                services: {
                    mongodb: {
                        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
                        dbName: mongoose.connection.name
                    },
                    redis: {
                        status: redis.status,
                        mode: redis.options?.mode || 'standalone'
                    },
                    socket: {
                        status: !!getIO() ? 'active' : 'inactive',
                        clients: getIO()?.engine.clientsCount || 0
                    }
                },
                system: {
                    memory: process.memoryUsage(),
                    nodeVersion: process.version,
                    platform: process.platform
                }
            };

            if (stats.services.mongodb.status !== 'connected') stats.status = 'unhealthy';
            else if (stats.services.redis.status !== 'ready') stats.status = 'degraded';

            res.json(stats);
        });

        app.use('/api/auth', require('./src/routes/userRoutes'));
        app.use('/api/tasks', require('./src/routes/taskRoutes'));
        app.use('/api/dashboard', require('./src/routes/dashboardRoutes'));
        app.use('/api/ai', require('./src/routes/ai.routes'));

        // Other API Routes
        app.use('/api/users', require('./src/routes/userRoutes'));
        app.use('/api/workspaces', require('./src/routes/workspaceRoutes'));
        app.use('/api/projects', require('./src/routes/projectRoutes'));
        app.use('/api/team', require('./src/routes/teamRoutes'));
        app.use('/api/ai-insights', require('./src/routes/aiRoutes'));
        app.use('/api/activity', require('./src/routes/activityRoutes'));
        app.use('/api/analytics', require('./src/routes/analyticsRoutes'));
        app.use('/api/invite', require('./src/routes/inviteRoutes'));
        app.use('/api/zoom', require('./src/routes/zoomRoutes'));
        app.use('/api/google', require('./routes/googleRoutes'));
        app.use('/api/leaderboard', require('./src/routes/leaderboardRoutes').default || require('./src/routes/leaderboardRoutes'));
        app.use('/api/system', require('./src/routes/systemRoutes'));

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
                try {
                    const redis = require('./src/config/redis');
                    if (redis && redis.quit) {
                        await redis.quit();
                        logger.info('✔ Redis connection closed');
                    }
                } catch (err) {
                    logger.warn('Redis not initialized, skipping shutdown.');
                }

                // 3. Terminate Database
                await closeDB();

                process.exit(0);
            });

            // Fallback timeout (Non-crashing in safe mode)
            setTimeout(() => {
                logger.error('✖ Could not close connections gracefully in time.');
                // process.exit(1); // Prevent crash looping
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        return new Promise((resolve) => {
            initIO(server);
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
        logger.error(error.stack);
        // Force loud crash on ANY startup failure to ensure visibility
        process.exit(1);
    }
};

if (process.env.NODE_ENV !== 'test') {
    startServer();
}

module.exports = { app, server, startServer };
