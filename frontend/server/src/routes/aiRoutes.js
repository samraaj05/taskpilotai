const express = require('express');
const router = express.Router();
const {
    getInsights,
    createInsight,
    invokeLLM,
    updateInsight,
    getDashboardInsights,
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getInsights)
    .post(protect, createInsight);

router.route('/invoke')
    .post(protect, invokeLLM);

router.get('/dashboard', protect, getDashboardInsights);

router.route('/:id')
    .put(protect, updateInsight);

module.exports = router;
