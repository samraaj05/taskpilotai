const express = require('express');
const router = express.Router();
const { getInviteData, acceptInvite, createInvite, registerViaInvite } = require('../controllers/inviteController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:token', getInviteData);
router.post('/accept', acceptInvite);
router.post('/send', protect, createInvite);
router.post('/register', registerViaInvite);

module.exports = router;
