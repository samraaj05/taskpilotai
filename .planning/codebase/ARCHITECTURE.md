# System Architecture - TaskPilot

This document outlines the architectural patterns, layers, and data flow of the TaskPilot application.

## Overview
TaskPilot follows a **Decoupled Architecture** with a clear separation between the frontend (Client) and the backend (Server). The system is designed for high responsiveness (Real-time), observability, and AI-first workflows.

## Backend Architecture (Node.js/Express)
The backend follows a modified **MVC Pattern** with additional layers for services, real-time coordination, and background jobs.

- **Routing Layer:** `frontend/server/src/routes/`
  - Defines the API endpoints and maps them to controllers.
  - Groups related endpoints (e.g., `userRoutes`, `taskRoutes`, `aiRoutes`).
- **Controller Layer:** `frontend/server/src/controllers/`
  - Orchestrates requests, validates inputs, and calls relevant services or models.
  - Responsibile for formatting API responses.
- **Model Layer (ODM):** `frontend/server/src/models/`
  - Uses Mongoose to define data schemas and validation rules for MongoDB.
  - Core Entities: `User`, `Workspace`, `Project`, `Task`, `Activity`, `Team`.
- **Service Layer (Business Logic):** `frontend/server/src/services/`
  - Encapsulates complex business logic, third-party integrations, and AI processing.
  - Keeps controllers thin and testable.
- **Real-time Layer (Socket.io):** `frontend/server/src/socket.js`
  - Manages persistent connections and facilitates instant updates for task changes, mentions, and team activity.
- **Background Job Layer (BullMQ):** `frontend/server/src/queue/`
  - Handles asynchronous, non-blocking tasks like email delivery, recurring notifications, and long-running AI analysis.

## Frontend Architecture (React/Vite)
The frontend is a **Component-Based Single Page Application (SPA)** with centralized state management for authentication and global settings.

- **Component Layer:** `frontend/src/components/`
  - Highly modular components divided into `ui/` (base Radix/Shadcn elements) and domain-specific components (e.g., `projects/`, `tasks/`).
- **Page Layer:** `frontend/src/Pages/`
  - High-level view components that compose domain components to form application screens.
- **Data Fetching & State Layer:** `frontend/src/api/` and `frontend/src/context/`
  - **Context API:** Used for cross-cutting concerns like `AuthContext`, `ThemeContext`, and `WorkspaceContext`.
  - **TanStack Query (React Query):** Primary tool for server state management, caching, and background synchronization.
- **Hook Layer:** `frontend/src/hooks/`
  - Encapsulates reusable UI logic and complex API interactions (e.g., `useToast`, `useAuth`).

## Core Data Flows
1. **API Request (CRUD):**
   Client (React Query) → Express Route → Middleware (Auth) → Controller → Service/Model → MongoDB → Controller → Client.
2. **Real-time Event:**
   Event (Backend Code) → Socket.io Emit → Client Listener → React Component State Update.
3. **AI Pipeline:**
   Client Request → Express AI Route → AI Service → Gemini API → Response Post-processing → Client View.
4. **Asynchronous Task:**
   Express Route → Queue Service (BullMQ) → Redis (Job Storage) → Worker Process (Background) → Email/System Notify → MongoDB (Update status).

## Observability & Performance
- **Middleware:** `observabilityMiddleware` and `requestLogger` track request latency and system health.
- **Crash Protection:** Global `uncaughtException` and `unhandledRejection` handlers in `server.cjs` prevent node process shutdowns from transient errors.
- **Cold Start Optimization:** Essential modules are preloaded at the top of `server.cjs` to minimize startup latency.
