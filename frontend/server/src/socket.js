const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io;

const initIO = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.NODE_ENV === 'production' ? /\.vercel\.app$/ : ["http://localhost:5173", "http://localhost:5000"],
            credentials: true,
        },
    });

    // Socket.IO Authentication Middleware
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.user = user;
            next();
        } catch (error) {
            logger.error(`Socket Auth Error: ${error.message}`);
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`⚡ Socket connected: ${socket.id} (User: ${socket.user.email})`);

        // Join AI Ops room for real-time monitoring
        socket.on('join-ai-ops', () => {
            socket.join('ai-ops');
            logger.info(`🧭 User ${socket.user.email} joined AI-OPS live stream`);
        });

        socket.on('disconnect', () => {
            logger.info(`🔥 Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
};

module.exports = { initIO, getIO };
