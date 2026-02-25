const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    // Default to 500 if status code is not set or is 200 (which it shouldn't be for an error)
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode || 500;
    // Phase 3: Error Classification
    let errorType = 'system_error';
    if (statusCode === 400) errorType = 'validation_error';
    if (statusCode === 401 || statusCode === 403) errorType = 'auth_error';

    // Log the error with detailed context
    logger.error(`[${errorType.toUpperCase()}] ${err.message}`, {
        requestId,
        errorType,
        method: req.method,
        url: req.originalUrl,
        stack: isProduction ? undefined : err.stack,
        body: req.method !== 'GET' ? req.body : undefined
    });

    res.status(statusCode).json({
        success: false,
        errorType,
        message: err.message || 'Internal Server Error',
        requestId,
        data: null,
        stack: isProduction ? null : err.stack,
    });
};

module.exports = {
    errorHandler,
};
