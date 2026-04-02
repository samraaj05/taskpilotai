# Technical Debt & Concerns - TaskPilot

This document outlines recognized technical debt, architecture gaps, and fragile areas in the TaskPilot codebase.

## Critical Concerns
- **[LACK OF FORMAL TESTING]:** The project lacks automated, repeatable unit and integration tests (e.g. no Jest or Mocha). Reliability depends on manual verification and standalone debug/seeder scripts.
- **[SECURITY - OVER-EXPOSURE]:** Many backend endpoints are marked as `@access Public` in comments (e.g. `teamController.js`), even when they clearly should be protected by user authentication. This can lead to unauthorized data manipulation.
- **[REAL-TIME SYNC COMPLEXITIES]:** Socket.io logic is tightly integrated with various controllers. If the server scales vertically or horizontally, the current implementation may require a more robust adapter (e.g. Redis adapter for Socket.io) for multi-node support.

## Fragile Areas
- **[ERROR HANDLING FOR AI]:** AI analysis routes (`aiRoutes`) are heavily dependent on external API availability and response format consistency. Unexpected tokens or rate limits on the AI provider side could trigger frontend crashes if not handled robustly.
- **[IN-MEMORY DATABASE TESTERS]:** `mongodb-memory-server` is used for localized testing. If datasets grow significantly during development mapping or seeding, local CI runners may hit memory limits.
- **[HARDCODED ORIGINS]:** CORS configuration in `server.cjs` includes multiple variations of `localhost` and `Vercel` patterns. Hardcoded patterns could cause authentication/integration failures in new environments or production.

## Technical Debt & Linting
- **[CONSOLE SPAM]:** Heavy use of `console.log` for logic tracking across all backend controllers (`teamController`, `taskController`, etc.). These should ideally be replaced with structured logging levels (`logger.debug`, `logger.info`) from the Winston integration.
- **[ASYNC-NON-BLOCKING EMAIL]:** While invitation emails are sent in the background using `.catch()`, a server crash exactly after a DB write but before email dispatch could result in missing communication. (Observed in `teamController.js`).
- **[MIXED MODULE TYPES]:** The backend uses `server.cjs` as an entry point, and while it mostly uses `require`, the frontend and some modern integrations (`resend`, modern `@google/generative-ai`) are strictly ES Modules. This causes slight friction in shared utility logic.

## Recommended Fixes (Immediate)
1. **Bootstrap Test Framework:** Initialize Jest/Supertest and write the first API integration test.
2. **Review API Access Control:** Enforce JWT verification on all `Public` marked routes that touch private Workspace/Team data.
3. **Structured Logging Migration:** Sweep and replace `console.log` with `logger` calls according to Winston configuration.
4. **Environment Pattern Cleanup:** Centralize all allowed origins into a configurable environment variable string/array.
