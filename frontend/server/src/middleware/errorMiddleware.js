const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Log error for internal monitoring
    logger.error(`[ERROR] ${req.method} ${req.url}: ${err.message}`, {
        stack: isProduction ? null : err.stack,
        body: req.body,
        user: req.user?.email
    });

    const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
    
    res.status(statusCode).json({
        success: false,
        message: isProduction && statusCode === 500 ? "Internal Server Error" : err.message,
        stack: isProduction ? null : err.stack,
        errorCode: err.code || 'INTERNAL_ERROR'
    });
};

module.exports = {
    errorHandler,
};
