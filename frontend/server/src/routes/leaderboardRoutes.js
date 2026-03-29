const express = require('express');
const { getProjectLeaderboard, getWorkspaceLeaderboard } = require('../controllers/leaderboardController');

const router = express.Router();

router.get('/project/:projectId', getProjectLeaderboard);
router.get('/workspace/:workspaceId', getWorkspaceLeaderboard);

module.exports = router;
