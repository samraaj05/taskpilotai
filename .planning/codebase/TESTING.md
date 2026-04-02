# Testing & Verification - TaskPilot

This document outlines the testing infrastructure, verification practices, and current coverage status for TaskPilot.

## Testing Philosophies
- **Stability First:** Use crash-protection handlers and fail-safes in production to ensure high availability.
- **Incremental Verification:** Manually verify each new feature before merge.
- **Isolated Debugging:** Utilize specialized debug scripts (`debug_insights.js`) for deep state analysis.

## Core Testing Tools
The following tools are available in the project for testing purposes:
- **[MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server):** Integrated (v11.0.1) for isolated, high-speed database testing and seeding without requiring a persistent Atlas connection.
- **[ESLint](https://eslint.org/):** Mandatory static analysis (v9.39.1) ensures code quality and catches common syntax/logic errors.
  - Configuration: `eslint.config.js`.
  - Plugins: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.
- **Diagnostic Scripts:**
  - `frontend/server/test-email.js` - SMTP/Nodemailer verification.
  - `frontend/server/debug_insights.js` - Real-time state check for tasks, users, and projects.
  - `frontend/server/list_users.js`, `check_user.js`, `delete_user.js` - User entity management diagnostics.
- **Database Seeding:**
  - `seed_enterprise.js` - Large-scale production-like data generation.
  - `seed_minimal.js` - Core functionality validation with minimal entities.
  - `seed_user.js` - Specific user profile preparation.

## Mocking & Environments
- **Redis Mocking:** Background workers (BullMQ) fallback into standard API-only mode if Redis is unavailable during development.
- **Environment Isolation:** Local, testing, and production environments are managed via isolated `.env` configuration files.

## Current Testing Coverage (Estimated)
- **Unit Testing:** ⚠️ Low formal coverage. Logic is mostly verified through manual testing or localized scripts.
- **Integration Testing:** ✅ Medium. Business logic flows (Auth -> Project -> Task) are regularly verified through end-to-end manual flows and seeder validations.
- **UI Testing:** ✅ Medium. Visual consistency and cross-browser responsiveness are verified during the development of React components.
- **Static Analysis:** ✅ High. ESLint is enforced across the frontend and backend core.

## Planned Improvements
- **Jest/Supertest Integration:** Introduce formal API integration tests for the Express backend.
- **React Testing Library:** Implement component-level unit tests for critical UI components (e.g. `TaskCard`, `Dashboard`).
- **E2E Playwright/Cypress:** Automation for full user journey verification.
