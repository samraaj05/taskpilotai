const asyncHandler = require('express-async-handler');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { logAction } = require('../utils/auditLogger');
const { SAFETY_CONFIG } = require('../config/constants');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Public
const getProjects = asyncHandler(async (req, res) => {
    const { orderBy, limit, ...filters } = req.query;

    const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
    if (workspaceId) {
        filters.workspaceId = workspaceId;
    }

    let query = Project.find(filters).lean();

    if (orderBy) {
        // Convert entity orderBy (e.g. '-created_date') to Mongoose sort (e.g. '-createdAt')
        const sortField = orderBy.replace('created_date', 'createdAt');
        query = query.sort(sortField);
    }

    if (limit) {
        const requestedLimit = parseInt(limit);
        const safeLimit = Math.min(requestedLimit, SAFETY_CONFIG.PAGINATION_LIMITS.PROJECTS);
        query = query.limit(safeLimit);
    } else {
        query = query.limit(SAFETY_CONFIG.PAGINATION_LIMITS.PROJECTS);
    }

    const projects = await query.exec();
    
    // Dynamically calculate progress and team metrics
    // Optimization: Skip heavy counts if too many projects in Safe Mode
    const projectsWithMetrics = await Promise.all(projects.map(async (project) => {
        try {
            const totalTasks = await Task.countDocuments({ project_id: project._id });
            const completedTasks = await Task.countDocuments({ project_id: project._id, status: 'done' });
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            return { 
                ...project, 
                progress,
                memberCount: project.member_emails?.length || 0,
                teamData: project.member_emails || []
            };
        } catch (e) {
            return { ...project, progress: 0, memberCount: 0, teamData: [] };
        }
    }));

    res.status(200).json({ success: true, data: projectsWithMetrics });
});

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Public
const getProject = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id).lean();

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    const totalTasks = await Task.countDocuments({ project_id: project._id });
    const completedTasks = await Task.countDocuments({ project_id: project._id, status: 'done' });
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.status(200).json({ 
        success: true, 
        data: { 
            ...project, 
            progress,
            memberCount: project.member_emails?.length || 0,
            teamData: project.member_emails || []
        } 
    });
});

// @desc    Create new project
// @route   POST /api/projects
// @access  Public
const createProject = asyncHandler(async (req, res) => {
    try {
        console.log("Incoming body:", req.body);
        console.log("Authenticated user:", req.user);

        if (!req.body.name) {
            res.status(400);
            throw new Error('Please add a name field');
        }

        const workspaceId = req.headers['x-workspace-id'] || req.body.workspaceId;
        if (!workspaceId) {
            res.status(400);
            throw new Error('workspaceId is required');
        }

        const project = await Project.create({
            workspaceId,
            name: req.body.name,
            description: req.body.description,
            status: req.body.status,
            owner_email: req.user.email,
            is_archived: false,
        });

        // Audit Log
        await logAction({
            userId: req.user.id || req.user._id,
            userEmail: req.user.email,
            action: 'PROJECT_CREATED',
            entityType: 'Project',
            entityId: project._id,
            workspaceId: project.workspaceId,
            metadata: { after: project },
            ipAddress: req.ip
        });

        res.status(201).json({ success: true, data: project });
    } catch (error) {
        console.error("CREATE PROJECT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
            stack: error.stack
        });
    }
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Public
const updateProject = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    const updatedProject = await Project.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
            new: true,
        }
    );

    // Audit Log
    await logAction({
        userId: req.user.id || req.user._id,
        userEmail: req.user.email,
        action: 'PROJECT_UPDATED',
        entityType: 'Project',
        entityId: updatedProject._id,
        workspaceId: updatedProject.workspaceId,
        metadata: { before: project, after: updatedProject },
        ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: updatedProject });
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Public
const deleteProject = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    await project.deleteOne();

    // Audit Log
    await logAction({
        userId: req.user.id || req.user._id,
        userEmail: req.user.email,
        action: 'PROJECT_DELETED',
        entityType: 'Project',
        entityId: project._id,
        workspaceId: project.workspaceId,
        metadata: { before: project },
        ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: { id: req.params.id } });
});

// @desc    Get project chat messages
// @route   GET /api/projects/:id/chat
// @access  Private
const getProjectChat = asyncHandler(async (req, res) => {
    const ChatMessage = require('../models/ChatMessage');
    const messages = await ChatMessage.find({ projectId: req.params.id })
        .populate('sender', 'name avatar email')
        .sort('createdAt')
        .lean();

    res.status(200).json({ success: true, data: messages });
});

module.exports = {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    getProjectChat,
};
