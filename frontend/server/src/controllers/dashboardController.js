const Project = require('../models/Project');
const Task = require('../models/Task');
const TeamMember = require('../models/TeamMember');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
exports.getDashboardStats = async (req, res) => {
    console.log("[PHASE3_STATS_REQUEST]");

    try {
        const userEmail = req.user?.email;
        const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;

        let activeProjects = 0;
        let totalTasks = 0;
        let myTasks = 0;
        let teamMembers = 0;

        // Fetch counts concurrently for performance, filtered by workspace
        const results = await Promise.allSettled([
            Project.countDocuments({ workspaceId, status: 'active' }),
            Task.countDocuments({ workspaceId }),
            userEmail ? Task.countDocuments({ workspaceId, assignee_email: userEmail }) : Promise.resolve(0),
            TeamMember.countDocuments({ workspaceId, is_active: true })
        ]);

        // Assign results if they succeeded
        if (results[0].status === 'fulfilled') activeProjects = results[0].value;
        if (results[1].status === 'fulfilled') totalTasks = results[1].value;
        if (results[2].status === 'fulfilled') myTasks = results[2].value;
        if (results[3].status === 'fulfilled') teamMembers = results[3].value;

        console.log("[PHASE3_STATS_SUCCESS]");

        return res.status(200).json({
            success: true,
            activeProjects,
            totalTasks,
            myTasks,
            teamMembers
        });

    } catch (err) {
        console.log("[PHASE3_STATS_ERROR]", err.message);

        return res.status(200).json({
            success: true,
            activeProjects: 0,
            totalTasks: 0,
            myTasks: 0,
            teamMembers: 0
        });
    }
};
