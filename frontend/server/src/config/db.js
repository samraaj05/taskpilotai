const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        let uri = process.env.MONGO_URI;

        // Try connecting to the provided URI first with a short timeout
        try {
            // logger.info(`Attempting to connect to Local MongoDB at ${uri}...`);
            const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
            logger.info(`✔ MongoDB Connected: ${conn.connection.host}`);
            return;
        } catch (err) {
            logger.warn('⚠ Local MongoDB not found. Starting In-Memory MongoDB...');
        }

        // Fallback to in-memory database
        // Use dynamic import or require inside to prevent crash if not yet installed?
        // No, we rely on it being installed.
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        uri = mongod.getUri();

        logger.info(`✔ In-Memory MongoDB Started at ${uri}`);
        const conn = await mongoose.connect(uri);
        logger.info(`✔ MongoDB Connected (In-Memory): ${conn.connection.host}`);

    } catch (error) {
        logger.error(`✖ Database connection ERROR: ${error.message}`);
        logger.warn('⚠ Server starting without Database. API will be mostly non-functional.');
    }
};

const closeDB = async () => {
    await mongoose.connection.close();
    logger.info('--- MongoDB Connection Closed ---');
};

module.exports = { connectDB, closeDB };
