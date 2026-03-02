const express = require('express');
const router = express.Router();
const { createZoomMeeting } = require('../services/zoomService');
const { protect } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/zoom/create
 * @desc    Create a Zoom meeting
 * @access  Private
 */
router.post('/create', protect, async (req, res) => {
    try {
        const { topic, startTime, duration } = req.body;

        if (!topic || !startTime) {
            return res.status(400).json({
                success: false,
                message: "Please provide both topic and startTime"
            });
        }

        const meeting = await createZoomMeeting(topic, startTime, duration);

        res.status(201).json({
            success: true,
            meeting: meeting
        });
    } catch (error) {
        console.error("Zoom Route Error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to create Zoom meeting"
        });
    }
});

module.exports = router;
