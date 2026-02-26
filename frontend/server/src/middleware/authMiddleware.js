const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[AUTH_PROTECT] No Authorization header');
        return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const token = authHeader.split(' ')[1];
    console.log('[AUTH_PROTECT_TOKEN]', token ? 'FOUND' : 'MISSING');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log('[AUTH_PROTECT_PASS] User authenticated');
        next();
    } catch (err) {
        console.log('[AUTH_PROTECT_ERROR]', err.message);
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Grant access to specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            res.status(403);
            throw new Error(`User role ${req.user.role} is not authorized to access this route`);
        }
        next();
    };
};

module.exports = { protect, authorize };
