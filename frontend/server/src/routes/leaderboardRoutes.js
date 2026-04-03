const express = require('express');
const { getProjectLeaderboard, getWorkspaceLeaderboard } = require('../controllers/leaderboardController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/project/:projectId', protect, getProjectLeaderboard);
router.get('/workspace/:workspaceId', protect, getWorkspaceLeaderboard);

module.exports = router;
