# Directory Structure - TaskPilot

This document outlines the organization and key file locations of the TaskPilot codebase.

## Root Directory (`/`)
- `.planning/` - GSD project planning, roadmap, and codebase map documentation.
- `frontend/` - Root directory for the entire application codebase (both client and server).
- `.cursor/` - Project-specific Cursor configuration and rules (if applicable).
- `README.md` - High-level project overview and setup instructions.

## Frontend Directory (`frontend/`)
The primary codebase repository containing both the React frontend and Node.js backend.

### Client Codebase (`frontend/src/`)
- `Pages/` - High-level React page components (Dashboard, Tasks, Projects, Team, etc.).
- `components/` - Reusable UI and domain-specific React components.
  - `ui/` - Foundational Shadcn/Radix UI elements (Button, Input, Card, etc.).
  - `projects/`, `tasks/`, `team/` - Domain-specific UI logic.
- `context/` - React contexts for global state management (`AuthContext`, `ThemeContext`).
- `hooks/` - Custom React hooks for shared logic (`useToast`, `useAuth`, etc.).
- `api/` - API request definitions and TanStack Query hook integrations.
- `lib/` - Shared utility libraries and third-party configuration (`utils.js`, `api-client.js`).
- `config/` - Frontend configuration constants and environment-specific settings.
- `Entities/` - Shared TypeScript/JavaScript data models or types for the frontend.
- `App.jsx`, `Layout.jsx` - Main application entry point and layout wrapper.
- `main.jsx` - The entry point for the Vite build process.

### Backend Codebase (`frontend/server/`)
- `src/` - The primary backend source directory.
  - `models/` - Mongoose data schemas and validation logic (Project, Task, User, etc.).
  - `controllers/` - Express request handlers and response orchestrators.
  - `routes/` - HTTP route definitions and API path mappings.
  - `services/` - Reusable business logic, AI integrations, and third-party services.
  - `middleware/` - Shared Express middleware (auth, error handled, CORS, logging).
  - `config/` - Backend configuration including database connection, Redis, and global constants.
  - `utils/` - Shared helper functions and utility modules (Email, Logger, etc.).
  - `queue/` - BullMQ workers and background job queues.
  - `socket.js` - Server-side Socket.io implementation.
- `server.cjs` - The main entry point for the Node.js Express server.
- `seed_*.js` - Database seeding scripts for development and demonstration environments.
- `logs/` - Directory for Winston application logs (persistent storage).
- `.env` - Environment variable configuration (Local development).

## Key Files & Entry Points
- Frontend Entry (Dev): `frontend/src/main.jsx`
- Backend Entry (Dev/Prod): `frontend/server/server.cjs`
- Database Config: `frontend/server/src/config/db.js`
- API Base Routing: `frontend/server/src/routes/`

## Deployment & Pipeline
- `vercel.json` - Vercel deployment configuration.
- `vite.config.js` - Vite build tool configuration.
- `postcss.config.cjs`, `tailwind.config.cjs` - CSS processing and Tailwind configuration.
- `eslint.config.js` - Code quality and linting rules.
