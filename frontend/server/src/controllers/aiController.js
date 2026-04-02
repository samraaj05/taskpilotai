const asyncHandler = require('express-async-handler');
const axios = require('axios');
const AIAnalysis = require('../models/AIAnalysis');
const { generateStats, generateRuleBasedInsights, getLLMRecommendations } = require('../services/aiInsightsService');
const { getOrSet, get } = require('../utils/cache');
const redis = require('../config/redis');
const { protect } = require('../middleware/authMiddleware');

// Initialize Google Gemini for AI insights
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// @desc    Get AI insights from database
// @route   GET /api/ai-insights
// @access  Public
const getInsights = asyncHandler(async (req, res) => {
    const { orderBy = '-createdAt', limit = 50 } = req.query;

    const sortField = orderBy.startsWith('-') ? orderBy.substring(1) : orderBy;
    const sortOrder = orderBy.startsWith('-') ? -1 : 1;

    const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
    const filter = {};
    if (workspaceId) {
        filter.workspaceId = workspaceId;
    }

    const insights = await AIAnalysis.find(filter)
        .sort({ [sortField]: sortOrder })
        .limit(parseInt(limit));

    res.status(200).json({ success: true, data: insights });
});

// @desc    Create/Save AI insight
// @route   POST /api/ai-insights
// @access  Public
const createInsight = asyncHandler(async (req, res) => {
    const workspaceId = req.headers['x-workspace-id'] || req.body.workspaceId;
    if (!workspaceId) {
        res.status(400);
        throw new Error('workspaceId is required');
    }
    const insight = await AIAnalysis.create({ ...req.body, workspaceId });
    res.status(201).json({ success: true, data: insight });
});

// @desc    Invoke Hugging Face LLM for analysis
// @route   POST /api/ai-insights/invoke
// @access  Public
const invokeLLM = asyncHandler(async (req, res) => {
    const { prompt: inputData, prompt_prefix, response_json_schema } = req.body;
    
    // Choose the appropriate prompt prefix
    const defaultPrefix = "You are an AI insights engine used in a production backend service.";
    const activePrefix = prompt_prefix || defaultPrefix;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({
            success: false,
            error: 'GEMINI_API_KEY is not configured on the server.',
            recommendation: 'Please add GEMINI_API_KEY to your server/.env file'
        });
    }

    const fullPrompt = `${activePrefix}
        STRICT RULES:
        - Return ONLY valid JSON matching the schema below.
        - No markdown, no conversational text.

        SCHEMA:
        ${response_json_schema ? JSON.stringify(response_json_schema, null, 2) : "JSON block"}

        INPUT:
        ${typeof inputData === 'string' ? inputData : JSON.stringify(inputData)}
    `;

    try {
        const response = await axios.post(GEMINI_URL, {
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { maxOutputTokens: 1000, temperature: 0.1 }
        });

        const text = response.data.candidates[0].content.parts[0].text;
        
        // Robust JSON extraction
        let cleanJsonString = text.trim();
        
        // Remove markdown code blocks if present
        if (cleanJsonString.startsWith("```")) {
            cleanJsonString = cleanJsonString.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }
        
        // If there's still non-JSON text around it (e.g., "Here is your JSON: {...}"), find the first { and last }
        const firstBrace = cleanJsonString.indexOf('{');
        const lastBrace = cleanJsonString.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanJsonString = cleanJsonString.substring(firstBrace, lastBrace + 1);
        }

        const jsonResponse = JSON.parse(cleanJsonString);
        
        res.status(200).json({
            success: true,
            data: jsonResponse
        });
    } catch (err) {
        console.error("AI Assignment Migration Error:", err.response?.data || err.message);
        res.status(500).json({
            success: false,
            error: 'AI suggest failed',
            details: err.message
        });
    }
});

// @desc    Update AI insight (apply/dismiss)
// @route   PUT /api/ai-insights/:id
// @access  Public
const updateInsight = asyncHandler(async (req, res) => {
    const insight = await AIAnalysis.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!insight) {
        res.status(404);
        throw new Error('Insight not found');
    }

    res.status(200).json({ success: true, data: insight });
});

// @desc    Get dashboard insights (stats + rule-based + AI)
// @route   GET /api/ai-insights/dashboard
// @access  Private
const getDashboardInsights = asyncHandler(async (req, res) => {
    const userEmail = req.user.email;
    const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;

    if (!workspaceId) {
        res.status(400);
        throw new Error('workspaceId is required');
    }

    const cacheKey = `ai_dashboard_${workspaceId}_${userEmail}`;

    const cachedData = await get(cacheKey);

    if (cachedData) {
        return res.status(200).json(cachedData);
    }

    // Cache miss: Trigger background job
    const { aiInsightsQueue } = require('../queue/queue');
    try {
        if (redis.status === 'ready') {
            await aiInsightsQueue.add(`ai_insights_${workspaceId}_${userEmail}`, { userEmail, workspaceId });
        } else {
            console.warn(`[AI_CONTROLLER] Redis status: ${redis.status}. Skipping background job for ${userEmail}`);
        }
    } catch (queueError) {
        console.warn('AI insights queue unavailable (Redis down). Skipping background update.', { error: queueError.message });
    }

    // Return current stats (fast) + placeholder for insights
    const stats = await generateStats(userEmail, workspaceId);
    const insights = generateRuleBasedInsights(stats);

    res.status(202).json({
        success: true,
        message: 'Insights are being generated in the background',
        data: {
            stats,
            insights,
            recommendations: ["Insights are being generated in the background. Please refresh in a few seconds."],
            isProcessing: true
        }
    });
});

module.exports = {
    getInsights,
    createInsight,
    invokeLLM,
    updateInsight,
    getDashboardInsights,
};
