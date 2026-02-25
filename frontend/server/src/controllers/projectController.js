const asyncHandler = require('express-async-handler');
const Project = require('../models/Project');
const { logAction } = require('../utils/auditLogger');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Public
const getProjects = asyncHandler(async (req, res) => {
    const { orderBy, limit, ...filters } = req.query;

    let query = Project.find(filters).lean();

    if (orderBy) {
        // Convert entity orderBy (e.g. '-created_date') to Mongoose sort (e.g. '-createdAt')
        const sortField = orderBy.replace('created_date', 'createdAt');
        query = query.sort(sortField);
    }

    if (limit) {
        query = query.limit(parseInt(limit));
    }

    const projects = await query.exec();
    res.status(200).json({ success: true, data: projects });
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

    res.status(200).json({ success: true, data: project });
});

// @desc    Create new project
// @route   POST /api/projects
// @access  Public
const createProject = asyncHandler(async (req, res) => {
    if (!req.body.name) {
        res.status(400);
        throw new Error('Please add a name field');
    }

    const project = await Project.create({
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
    });

    // Audit Log
    await logAction({
        userId: req.user._id,
        userEmail: req.user.email,
        action: 'PROJECT_CREATED',
        entityType: 'Project',
        entityId: project._id,
        metadata: { after: project },
        ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: project });
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
        userId: req.user._id,
        userEmail: req.user.email,
        action: 'PROJECT_UPDATED',
        entityType: 'Project',
        entityId: updatedProject._id,
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
        userId: req.user._id,
        userEmail: req.user.email,
        action: 'PROJECT_DELETED',
        entityType: 'Project',
        entityId: project._id,
        metadata: { before: project },
        ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: { id: req.params.id } });
});

module.exports = {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
};
