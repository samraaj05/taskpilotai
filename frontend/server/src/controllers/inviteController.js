const asyncHandler = require('express-async-handler');
const logger = require('../utils/logger');
const crypto = require('crypto');
const Invite = require('../models/Invite');
const TeamMember = require('../models/TeamMember');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendInvitationEmail } = require('../utils/mailer');

const generateAccessToken = (id, email, name) => {
    return jwt.sign({ id, email, name }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const generateRefreshToken = (id, email) => {
    return jwt.sign({ id, email }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Get invite details by token
// @route   GET /api/invite/:token
// @access  Public
const getInviteData = asyncHandler(async (req, res) => {
    const { token } = req.params;

    const invite = await Invite.findOne({ inviteToken: token });

    if (!invite) {
        res.status(404);
        throw new Error('Invitation not found');
    }

    if (invite.used) {
        res.status(400);
        throw new Error('This invitation has already been used');
    }

    if (invite.expiryTime < new Date()) {
        res.status(400);
        throw new Error('This invitation has expired');
    }

    res.status(200).json({
        success: true,
        data: {
            email: invite.email,
            role: invite.role,
            workspaceId: invite.workspaceId,
            department: invite.department,
            skills: invite.skills,
        },
    });
});

// @desc    Accept invitation
// @route   POST /api/invite/accept
// @access  Public
const acceptInvite = asyncHandler(async (req, res) => {
    const { token } = req.body;

    const invite = await Invite.findOne({ inviteToken: token });

    if (!invite) {
        res.status(404);
        throw new Error('Invitation not found');
    }

    if (invite.used) {
        res.status(400);
        throw new Error('This invitation has already been used');
    }

    if (invite.expiryTime < new Date()) {
        res.status(400);
        throw new Error('This invitation has expired');
    }

    // Check if user already a member
    const memberExists = await TeamMember.findOne({ user_email: invite.email, workspaceId: invite.workspaceId });

    if (memberExists) {
        invite.used = true;
        await invite.save();
        res.status(400);
        throw new Error('You are already a member of this workspace');
    }

    // Create team member
    // Find and activate existing member or create new one
    const member = await TeamMember.findOneAndUpdate(
        { user_email: invite.email, workspaceId: invite.workspaceId },
        { 
            is_active: true,
            role: invite.role,
            display_name: invite.email.split('@')[0], // Default display name
            department: invite.department || '',
            skills: invite.skills || [],
        },
        { new: true, upsert: true }
    );

    if (member) {
        invite.used = true;
        await invite.save();
        res.status(201).json({
            success: true,
            message: 'Invitation accepted successfully',
            data: member,
        });
    } else {
        res.status(400);
        throw new Error('Failed to accept invitation');
    }
});

// @desc    Create and send invitation
// @route   POST /api/invite/send
// @access  Private (Admin/Owner)
const createInvite = asyncHandler(async (req, res) => {
    const { email, role, department, skills, workspaceId } = req.body;

    if (!email || !workspaceId) {
        res.status(400);
        throw new Error('Please provide email and workspace ID');
    }

    // Check if invitation already exists and not used
    const existingInvite = await Invite.findOne({ email, workspaceId, used: false });
    if (existingInvite && existingInvite.expiryTime > new Date()) {
        res.status(400);
        throw new Error('An active invitation for this email already exists');
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiryTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await Invite.create({
        inviteToken,
        email,
        role: role || 'member',
        workspaceId,
        department,
        skills,
        expiryTime,
    });

    if (invite) {
        // Optional: Send real email if mailer is configured
        try {
            if (process.env.SMTP_USER) {
                await sendInvitationEmail(email, role || 'member', inviteToken);
            }
        } catch (err) {
            logger.error(`Mail send failed: ${err.message}`);
        }

        res.status(201).json({
            success: true,
            message: 'Invitation created successfully',
            data: {
                token: inviteToken,
                invite
            }
        });
    } else {
        res.status(400);
        throw new Error('Failed to create invitation');
    }
});

// @desc    Register user via invitation
// @route   POST /api/invite/register
// @access  Public
const registerViaInvite = asyncHandler(async (req, res) => {
    const { name, password, token } = req.body;

    if (!name || !password || !token) {
        res.status(400);
        throw new Error('Please provide name, password and token');
    }

    const invite = await Invite.findOne({ inviteToken: token });

    if (!invite || invite.used || invite.expiryTime < new Date()) {
        res.status(400);
        throw new Error('Invalid or expired invitation token');
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: invite.email });
    if (userExists) {
        res.status(400);
        throw new Error('User with this email already exists. Please login instead.');
    }

    // Create User
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = await User.create({
        name,
        email: invite.email,
        password: hashedPassword,
        role: 'user'
    });

    if (user) {
        // Create Team Member
        // Find and activate existing member or create new one
        await TeamMember.findOneAndUpdate(
            { user_email: user.email, workspaceId: invite.workspaceId },
            { 
                is_active: true,
                role: invite.role,
                display_name: user.name,
                department: invite.department || '',
                skills: invite.skills || [],
            },
            { new: true, upsert: true }
        );

        invite.used = true;
        await invite.save();

        const accessToken = generateAccessToken(user._id, user.email, user.name);
        const refreshToken = generateRefreshToken(user._id, user.email);

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
            accessToken,
            user: { _id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } else {
        res.status(400);
        throw new Error('Failed to create user via invitation');
    }
});

module.exports = {
    getInviteData,
    acceptInvite,
    createInvite,
    registerViaInvite
};
