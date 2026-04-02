# External Integrations - TaskPilot

This document outlines the external services, APIs, and databases TaskPilot integrates with for core functionality.

## Core Databases & Caching
- **[MongoDB](https://www.mongodb.com/) (Atlas):** Primary persistent storage for all system entities including Users, Workspaces, Teams, Projects, Tasks, and Activities.
  - Used via [Mongoose](https://mongoosejs.com/) for ODM functionality.
- **[Redis](https://redis.io/):** Used for fast caching, session management, and robust background job processing with BullMQ.
  - Required for task overdue monitoring and recurring background scans.

## Specialized API Integrations
- **[Google Generative AI (Gemini)](https://ai.google.dev/):** Used for advanced AI-driven features like task analysis, insights, and automated suggestions.
  - Library: `@google/generative-ai` (v0.24.1)
  - Key Service: Gemini 1.5 Pro/Flash (as configured in `aiRoutes`).
- **[Google Cloud APIs](https://console.cloud.google.com/):**
  - **Google OAuth 2.0:** Integrated for user authentication and authorization.
  - **Google Calendar/Contacts (Potential):** Integration hooks found in `googleRoutes`.
  - Library: `googleapis` (v171.4.0)
- **[Zoom Video SDK](https://developers.zoom.us/docs/video-sdk/):** Integrated for video conferencing and real-time collaboration features within the workspace.
  - Frontend Library: `@zoom/videosdk` (v2.3.14)
  - Backend Routes: `zoomRoutes` for meeting initialization and Webhook management.

## Communication & Notifications
- **[Resend](https://resend.com/):** Modern email sending service used for transactional emails.
  - Library: `resend` (v6.9.3)
- **[Nodemailer](https://nodemailer.com/) (Standard SMTP):** Fallback or alternative email delivery system using standard SMTP configuration (e.g., Gmail SMTP).
  - Used for sending team invitations and system notifications.
- **[Socket.io](https://socket.io/):** Real-time, bi-directional communication layer between the frontend and backend.
  - Essential for live task updates, team chat, and real-time dashboard monitoring.

## Fallback & Conditional Services
- **[Hugging Face](https://huggingface.co/):** Referenced in production environment templates as an optional AI provider, typically for fallback inference or specific NLP tasks.
- **[MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server):** Used for fast, isolated database testing in CI/CD and localized test environments.

## Integration Hooks Map
- **Auth:** `googleRoutes`, `userRoutes`
- **Video:** `zoomRoutes`, `src/socket.js`
- **Email:** `src/utils/mailer.js`, `src/utils/emailService.js`
- **Real-time:** `frontend/server/src/socket.js`
- **AI Analytics:** `frontend/server/src/routes/aiRoutes.js`, `ai.routes.ts` (if applicable)
