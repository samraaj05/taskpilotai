const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const seedDatabase = require('../../seed_enterprise');

// @desc    Seed demo data for the current user
// @route   POST /api/system/seed-demo
// @access  Private
router.post('/seed-demo', protect, async (req, res) => {
    try {
        console.log(`[SEED_DEMO] Triggered for user: ${req.user.email}`);
        
        // Run the seeding script for this specific user
        await seedDatabase(req.user.email);
        
        res.status(200).json({
            success: true,
            message: 'Enterprise demo environment prepared successfully.'
        });
    } catch (error) {
        console.error('[SEED_DEMO_ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Failed to prepare demo environment.'
        });
    }
});

module.exports = router;
