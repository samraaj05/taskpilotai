const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisOptions = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
        // Fixed 3 second retry delay as requested
        const delay = 3000;
        logger.info(`[REDIS] Connection failed. Retrying in ${delay}ms... (Attempt ${times})`);
        return delay;
    },
    maxRetriesPerRequest: null, // Required for BullMQ
    connectTimeout: 10000, // Increased timeout to 10s
};

const redis = new Redis(redisOptions);

redis.on('connect', () => {
    logger.info('--- 🚀 Redis Connected SUCCESS ---');
});

redis.on('ready', () => {
    logger.info('--- ⚡ Redis Client Ready ---');
});

redis.on('error', (err) => {
    // Only log once every 10 seconds to prevent log flood
    if (!redis._lastErrorLog || Date.now() - redis._lastErrorLog > 10000) {
        logger.error(`[REDIS] Connection Error: ${err.message}`);
        redis._lastErrorLog = Date.now();
    }
});

module.exports = redis;
