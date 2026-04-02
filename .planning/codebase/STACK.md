# Technology Stack - TaskPilot

This document outlines the tech stack, runtimes, and core dependencies for both the frontend and backend of TaskPilot.

## Core Runtime & Environments
- **Frontend Runtime:** Browser (Vite-based development server)
- **Backend Runtime:** Node.js (Express server)
- **Package Manager:** `npm`
- **Languages:** JavaScript (ESM in frontend, CommonJS in backend-root, ESM in `src/`)

## Backend Stack
- **Framework:** [Express](https://expressjs.com/) (v4.19.2)
- **Database:** [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/) (v8.3.4)
- **Caching & Queues:** [Redis](https://redis.io/) via [ioredis](https://github.com/luin/ioredis) (v5.9.2) and [BullMQ](https://docs.bullmq.io/) (v5.67.2)
- **Authentication:** [Passport.js](https://www.passportjs.org/) (referenced), [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) (v9.0.3), [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **Real-time:** [Socket.io](https://socket.io/) (v4.8.3)
- **AI Integration:** [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) (v0.24.1)
- **Logging:** [Winston](https://github.com/winstonjs/winston) (v3.19.0)
- **Utilities:** `axios`, `dotenv`, `uuid`, `node-cron`, `compression`, `helmet`, `cookie-parser`

## Frontend Stack
- **Framework:** [React](https://reactjs.org/) (v19.2.0)
- **Build Tool:** [Vite](https://vitejs.dev/) (v7.2.4)
- **State Management & Data Fetching:** [@tanstack/react-query](https://tanstack.com/query) (v5.90.20)
- **Routing:** [React Router](https://reactrouter.com/) (v7.13.0)
- **UI Components:** [Radix UI](https://www.radix-ui.com/), [Shadcn UI](https://ui.shadcn.com/) (utilizing `class-variance-authority`, `tailwind-merge`, `clsx`)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (v3.4.17)
- **Icons:** [Lucide React](https://lucide.dev/) (v0.563.0)
- **Forms & Inputs:** `react-day-picker`, `cmdk`, `input-otp`
- **Charts:** [Recharts](https://recharts.org/) (v3.7.0)
- **Real-time:** `socket.io-client` (v4.8.3)
- **Markdown:** `react-markdown` (v10.1.0)

## Infrastructure Requirements
- **MongoDB:** Required for persistent storage (Workspaces, Projects, Tasks, Users)
- **Redis:** Required for background jobs (BullMQ) and real-time coordination
- **SMTP:** Required for email notifications and invitations
- **External URLs:** `FRONTEND_URL` and `VITE_API_URL` must be correctly configured in `.env` files for production.
