const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        logger.error('✖ CRITICAL ERROR: MONGO_URI is not defined in environment variables.');
        process.exit(1);
    }

    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000
        });
        logger.info(`✔ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`✖ Database connection ERROR: ${error.message}`);
        console.error(error.stack);
        process.exit(1); // Ensure loud crash
    }
};

const closeDB = async () => {
    await mongoose.connection.close();
    logger.info('--- MongoDB Connection Closed ---');
};

module.exports = { connectDB, closeDB };
