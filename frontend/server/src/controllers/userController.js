const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { logAction } = require('../utils/auditLogger');

const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
};

const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        res.status(400);
        throw new Error('Please add all fields');
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({ name, email, password: hashedPassword, role: role || 'user' });
    if (user) {
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);
        user.refreshToken = refreshToken;
        await user.save();
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.status(201).json({
            success: true,
            accessToken: accessToken,
            user: { _id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    console.log("[LOGIN_REQUEST] Login attempt for:", email);

    try {
        const user = await User.findOne({ email });

        if (!user) {
            console.log("[LOGIN_ERROR] User not found:", email);
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        console.log("[USER_FOUND] User found:", email);

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("[LOGIN_ERROR] Password mismatch for:", email);
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshToken = refreshToken;
        await user.save();

        console.log("[TOKEN_CREATED] Tokens generated for:", email);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // Audit Log (Optional but kept as it's safe)
        try {
            await logAction({
                userId: user._id,
                userEmail: user.email,
                action: 'USER_LOGIN',
                entityType: 'User',
                entityId: user._id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
        } catch (auditError) {
            console.error("Non-critical audit log failure:", auditError.message);
        }

        return res.status(200).json({
            success: true,
            accessToken: accessToken,
            user: { _id: user.id, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error("[LOGIN_ERROR] Unexpected server error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const refresh = asyncHandler(async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.refreshToken) return res.sendStatus(401);
    const refreshToken = cookies.refreshToken;
    const user = await User.findOne({ refreshToken });
    if (!user) return res.sendStatus(403);
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, (err, decoded) => {
        if (err || user._id.toString() !== decoded.id) return res.sendStatus(403);
        const accessToken = generateAccessToken(user._id);
        res.json({
            success: true,
            data: { token: accessToken }
        });
    });
});

const logoutUser = asyncHandler(async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.refreshToken) return res.sendStatus(204);
    const refreshToken = cookies.refreshToken;
    const user = await User.findOne({ refreshToken });
    if (user) {
        // Audit Log
        await logAction({
            userId: user._id,
            userEmail: user.email,
            action: 'USER_LOGOUT',
            entityType: 'User',
            entityId: user._id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        user.refreshToken = '';
        await user.save();
    }
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.sendStatus(204);
});

const getMe = async (req, res) => {
    try {
        console.log('[AUTH_ME_REQUEST]');

        // req.user is already set by protect middleware
        if (!req.user) {
            console.log('[AUTH_ME_NO_USER]');
            return res.status(200).json({
                success: true,
                user: null
            });
        }

        console.log('[AUTH_ME_SUCCESS]');
        return res.status(200).json({
            success: true,
            user: req.user
        });

    } catch (err) {
        console.log('[AUTH_ME_ERROR]', err.message);

        // NEVER CRASH SERVER
        return res.status(200).json({
            success: true,
            user: req.user || null
        });
    }
};

module.exports = { registerUser, loginUser, refresh, logoutUser, getMe };
