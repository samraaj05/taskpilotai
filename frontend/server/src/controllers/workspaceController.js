const asyncHandler = require('express-async-handler');
const Workspace = require('../models/Workspace');
const { seedWorkspaceData } = require('../utils/workspaceSeeder');

// @desc    Get all workspaces for the logged in user
// @route   GET /api/workspaces
// @access  Private
const getWorkspaces = asyncHandler(async (req, res) => {
    // Return workspaces where user is owner or in member_emails
    const isAdmin = req.user.role === 'admin';
    const query = isAdmin 
        ? { is_archived: false } 
        : { 
            is_archived: false,
            $or: [
                { owner_id: req.user.id || req.user._id },
                { member_emails: req.user.email }
            ]
          };

    let workspaces = await Workspace.find(query).sort({ createdAt: -1 });

    // --- STABILIZATION SAFE MODE ---
    const Task = require('../models/Task');
    const TeamMember = require('../models/TeamMember');
    const seedMinimal = require('../../seed_minimal');

    // 1. Trigger if user has no workspaces
    if (workspaces.length === 0) {
        console.log(`[STABILIZATION] User ${req.user.email} has no workspaces. Assigning to Minimal Env...`);
        
        // Seed (idempotent, minimal)
        await seedMinimal(req.user.email);
        
        // Re-fetch workspaces for the user
        const memberShip = await TeamMember.find({ user_email: req.user.email }).populate('workspaceId');
        workspaces = memberShip.map(m => m.workspaceId).filter(ws => ws !== null);
        
        if (workspaces.length > 0) {
            return res.status(200).json({
                success: true,
                data: workspaces
            });
        }
    }

    // 2. Optimized Hollow Check Disable in Stabilization Mode
    // const activeWorkspaceId = req.query.activeWorkspaceId;
    // if (activeWorkspaceId) {
    //     const taskCount = await Task.countDocuments({ workspaceId: activeWorkspaceId });
    //     if (taskCount < 10) {
    //         console.log(`[GUARANTEE] Workspace ${activeWorkspaceId} is hollow. Repairing...`);
    //         await seedEnterprise(req.user.email);
    //         workspaces = await Workspace.find(query).sort({ createdAt: -1 });
    //     }
    // }

    res.status(200).json({
        success: true,
        data: workspaces
    });
});

// @desc    Create new workspace
// @route   POST /api/workspaces
// @access  Private
const createWorkspace = asyncHandler(async (req, res) => {
    const { name, description, domain, color, member_emails, leader_emails } = req.body;

    // Ensure the creator is in the member emails if not explicitly set
    const emails = new Set(member_emails || []);
    emails.add(req.user.email);

    const workspace = await Workspace.create({
        name,
        description,
        domain,
        color,
        owner_id: req.user.id || req.user._id,
        member_emails: Array.from(emails),
        leader_emails: leader_emails || [],
    });

    res.status(201).json({
        success: true,
        data: workspace
    });
});

// @desc    Update workspace
// @route   PUT /api/workspaces/:id
// @access  Private
const updateWorkspace = asyncHandler(async (req, res) => {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
        res.status(404);
        throw new Error('Workspace not found');
    }

    // Check permissions (Admin or Owner or Leader)
    const isAdmin = req.user.role === 'admin';
    const isOwner = workspace.owner_id.toString() === (req.user.id || req.user._id).toString();
    const isLeader = workspace.leader_emails.includes(req.user.email);

    if (!isAdmin && !isOwner && !isLeader) {
        res.status(403);
        throw new Error('User not authorized to update this workspace');
    }

    const updatedWorkspace = await Workspace.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        data: updatedWorkspace
    });
});

// @desc    Delete (archive) workspace
// @route   DELETE /api/workspaces/:id
// @access  Private
const deleteWorkspace = asyncHandler(async (req, res) => {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
        res.status(404);
        throw new Error('Workspace not found');
    }

    // Only Admin or Owner can delete
    const isAdmin = req.user.role === 'admin';
    const isOwner = workspace.owner_id.toString() === (req.user.id || req.user._id).toString();

    if (!isAdmin && !isOwner) {
        res.status(403);
        throw new Error('User not authorized to delete this workspace');
    }

    // Soft delete
    workspace.is_archived = true;
    await workspace.save();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Seed workspace with demo data
// @route   POST /api/workspaces/:id/seed
// @access  Private
const seedWorkspace = asyncHandler(async (req, res) => {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
        res.status(404);
        throw new Error('Workspace not found');
    }

    // Only Owner can seed
    const isOwner = workspace.owner_id.toString() === (req.user.id || req.user._id).toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
        res.status(403);
        throw new Error('Only the workspace owner can seed demo data');
    }

    const result = await seedWorkspaceData(req.params.id, req.user);

    if (result.success) {
        res.status(200).json({
            success: true,
            message: 'Workspace seeded successfully',
            data: result
        });
    } else {
        res.status(400).json({
            success: false,
            message: result.message
        });
    }
});

module.exports = {
    getWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    seedWorkspace
};
