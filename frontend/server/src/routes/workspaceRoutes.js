const express = require('express');
const router = express.Router();
const {
    getWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    seedWorkspace
} = require('../controllers/workspaceController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getWorkspaces)
    .post(protect, createWorkspace);

router.route('/:id')
    .put(protect, updateWorkspace)
    .delete(protect, deleteWorkspace);

router.post('/:id/seed', protect, seedWorkspace);

module.exports = router;
