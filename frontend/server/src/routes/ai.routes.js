const express = require('express');
const router = express.Router();
const axios = require('axios');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');

async function askGemini(promptText, maxOutputTokens = 800) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    try {
        console.log(`[AI_CHAT] Calling Gemini model: gemini-2.5-flash (Key: ${GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 5) + '...' + GEMINI_API_KEY.slice(-4) : 'MISSING'})`);
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            { text: promptText }
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: maxOutputTokens,
                    temperature: 0.1
                }
            }
        );

        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini API error:", error.response?.data || error.message);
        throw error;
    }
}

router.post('/chat', async (req, res) => {
    const { message: userMessage, projectId, history = [] } = req.body;

    if (!userMessage) {
        return res.status(400).json({ success: false, message: 'Message is required' });
    }

    try {
        const msg = userMessage.toLowerCase();

        // 1. PROJECT SUMMARIZATION (No context needed)
        if (msg.includes("summarize project") && projectId) {
            const project = await Project.findById(projectId);
            const tasks = await Task.find({ project: projectId });
            const members = await User.find({ _id: { $in: project.members } });

            const context = `
Project Name: ${project.name}

Tasks:
${tasks.map(t => `• ${t.title} (${t.status})`).join("\n")}

Team Members:
${members.map(m => m.name).join(", ")}
`;
            const prompt = `
You are an AI assistant for a project management platform called TaskPilot.
Today's Date: ${new Date().toDateString()}

Summarize this project in 4 bullet points.

${context}
`;
            const aiReply = await askGemini(prompt, 500);
            return res.json({ reply: aiReply });
        }

        // 2. TASK EXTRACTION (No context needed)
        if (msg.includes("create task") && projectId) {
            const prompt = `
Extract task information from the following message.
Today's Date: ${new Date().toDateString()}

Return JSON only with:
title
priority
description

Message:
${userMessage}
`;
            const aiReply = await askGemini(prompt, 200);

            const jsonMatch = aiReply.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiData = JSON.parse(jsonMatch[0]);
                const newTask = new Task({
                    title: aiData.title,
                    description: aiData.description,
                    priority: aiData.priority || 'medium',
                    project: projectId,
                    status: "todo"
                });
                await newTask.save();
                return res.json({ reply: `Task created successfully: ${aiData.title}` });
            } else {
                return res.json({ reply: "I couldn't extract task details. Please provide title, description, and priority." });
            }
        }

        // 3. CHAT SUMMARIZATION (No context needed)
        if (msg.includes("summarize chat") && projectId) {
            const messages = await ChatMessage
                .find({ projectId })
                .sort({ createdAt: -1 })
                .limit(20);

            const chatText = messages
                .reverse()
                .map(m => `${m.senderName || 'User'}: ${m.message}`)
                .join("\n");

            const prompt = `
Summarize the following team discussion in 4 bullet points.
Today's Date: ${new Date().toDateString()}

Chat Messages:
${chatText}
`;
            const aiReply = await askGemini(prompt, 500);
            return res.json({ reply: aiReply });
        }

        // 4. GENERAL CHAT (WITH CONTEXT)
        const chatContext = history.slice(-5).map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join("\n");

        const prompt = `
You are the TaskPilot AI Assistant, a helpful and professional project management expert.
Today's Date: ${new Date().toDateString()}

PREVIOUS CONVERSATION CONTEXT:
${chatContext || "No previous history."}

CURRENT USER QUESTION:
${userMessage}

Your goal:
1. Provide accurate and actionable advice.
2. Maintain context from previous messages (e.g., if the user asks "tell me more" about a previous topic).
3. Use Markdown for clarity (bold, italics, lists).
4. Be concise and professional.
`;
        const aiReply = await askGemini(prompt, 800);
        res.json({ reply: aiReply });
    } catch (error) {
        console.error("Gemini error:", error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            error: "AI processing failed", 
            details: error.response?.data?.error?.message || error.message 
        });
    }
});

module.exports = router;
