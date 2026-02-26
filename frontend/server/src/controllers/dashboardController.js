const Project = require('../models/Project');
const Task = require('../models/Task');
const TeamMember = require('../models/TeamMember');
const asyncHandler = require('express-async-handler');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = asyncHandler(async (req, res) => {
    console.log("[PHASE3_STATS_REQUEST] User:", req.user?._id || "Unknown");

    try {
        const userEmail = req.user?.email;

        // Fetch counts concurrently for performance
        const [activeProjects, totalTasks, myTasks, teamMembers] = await Promise.all([
            Project.countDocuments({ status: 'active' }),
            Task.countDocuments({}),
            Task.countDocuments({ assignee_email: userEmail }),
            TeamMember.countDocuments({ is_active: true })
        ]);

        console.log("[PHASE3_STATS_SUCCESS] Aggregated metrics successfully");

        res.status(200).json({
            success: true,
            activeProjects,
            totalTasks,
            myTasks,
            teamMembers
        });
    } catch (error) {
        console.error("[PHASE3_STATS_ERROR] Failed to aggregate stats:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard statistics"
        });
    }
});

module.exports = {
    getDashboardStats
};
