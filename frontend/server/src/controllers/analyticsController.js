const asyncHandler = require('express-async-handler');
const Task = require('../models/Task');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');
const { getOrSet } = require('../utils/cache');
const { SAFETY_CONFIG } = require('../config/constants');

// @desc    Get system-wide or user-specific analytics
// @route   GET /api/analytics
// @access  Private
const getAnalytics = asyncHandler(async (req, res) => {
    const isAdmin = req.user.role === 'admin';
    const userEmail = req.user.email;
    let workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
    if (!workspaceId && req.query.workspace_id) workspaceId = req.query.workspace_id;
    
    if (!workspaceId) {
        res.status(400);
        throw new Error('workspaceId is required for analytics');
    }

    const matchObj = { workspaceId: new mongoose.Types.ObjectId(workspaceId) };
    if (!isAdmin) {
        matchObj.assignee_email = userEmail;
    }

    const cacheKey = `analytics_${workspaceId}_${isAdmin ? 'admin' : userEmail}`;
    let isSafeMode = false;

    const analyticsData = await getOrSet(cacheKey, async () => {
        try {
            // If in Safe Demo Mode and Snapshots Only is enabled, we might skip heavy calc
            // But for now, we try once.
            
            // 1. Task Throughput (Monthly)
            const monthlyThroughput = await Task.aggregate([
                { $match: matchObj },
                {
                    $group: {
                        _id: { $month: "$createdAt" },
                        count: { $sum: 1 },
                        completed: {
                            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] }
                        }
                    }
                },
                { $sort: { "_id": 1 } },
                { $limit: 12 } // Safety limit
            ]);

            // 2. Priority Distribution
            const priorityDist = await Task.aggregate([
                { $match: matchObj },
                {
                    $group: {
                        _id: "$priority",
                        count: { $sum: 1 }
                    }
                }
            ]);

            // 3. User Productivity (Admin Only)
            let userProductivity = [];
            if (isAdmin) {
                userProductivity = await Task.aggregate([
                    { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
                    {
                        $group: {
                            _id: "$assignee_email",
                            total: { $sum: 1 },
                            completed: {
                                $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] }
                            }
                        }
                    },
                    { $sort: { total: -1 } },
                    { $limit: SAFETY_CONFIG.PAGINATION_LIMITS.LOGS } // Reuse limit
                ]);
            }

            return {
                monthlyThroughput,
                priorityDist,
                userProductivity,
                safeMode: false
            };
        } catch (aggregationError) {
            console.error('[ANALYTICS_ERROR] Aggregation failed, returning empty state:', aggregationError.message);
            isSafeMode = true;
            return {
                monthlyThroughput: [],
                priorityDist: [],
                userProductivity: [],
                safeMode: true
            };
        }
    }, SAFETY_CONFIG.ANALYTICS.CACHE_SNAPSHOT_ONLY ? 3600 : 900); // 1 hour TTL in safe mode

    res.status(200).json({
        success: true,
        data: analyticsData,
        safeMode: analyticsData.safeMode || isSafeMode
    });
});

module.exports = {
    getAnalytics
};
