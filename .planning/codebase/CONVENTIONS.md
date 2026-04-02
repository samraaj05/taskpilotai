# Coding Conventions - TaskPilot

This document outlines the code style, patterns, and development best practices used for TaskPilot.

## General Principles
- **Clarity over Brevity:** Use descriptive variable and function names.
- **Fail Gracefully:** Use crash-protection handlers in `server.cjs` and global error boundaries in the frontend.
- **Security by Default:** Always use middleware for auth and input validation.

## Backend (Node.js/Express)
- **Modularity:** Use CommonJS (`require`/`module.exports`) for backend-root modules and standard ES Modules where supported (e.g. `src/` modules if configured for type:module).
- **Controller Pattern:** All controllers must be wrapped in `express-async-handler` to automatically catch errors and pass them to the global error middleware.
  ```javascript
  const myController = asyncHandler(async (req, res) => {
      // Async logic without try/catch
  });
  ```
- **Response Format:** All API responses must follow a consistent structure:
  - **Success:** `res.status(200).json({ success: true, data: result })`
  - **Error:** `res.status(400).json({ success: false, message: 'Detail' })` (implicitly handled by `errorHandler` middleware).
- **Naming:**
  - Variables/Functions: `camelCase`
  - Models/Classes: `PascalCase`
  - Environment Variables: `UPPER_SNAKE_CASE`
- **Error Handling:** Centralized in `src/middleware/errorMiddleware.js`. Use `throw new Error('Message')` in controllers after setting `res.status()`.

## Frontend (React/Vite)
- **Functional Components:** All React components must be functional using hooks.
- **Atomic Components:** Follow a pattern of small, reusable components in `src/components/` composed into larger views in `src/Pages/`.
- **State Management:**
  - **Local UI State:** `useState`, `useReducer`.
  - **Server State:** Always use `@tanstack/react-query` for fetching, caching, and mutations.
  - **Global Context:** Use React Context for authentication and theming.
- **Styling:** Use Tailwind CSS utility classes and Shadcn UI components for visual consistency.
- **Props Validation:** Standardize on functional components with TypeScript-like clarity (though the project is currently JavaScript).
- **Conditional Rendering:** Use logical `&&` or ternary operators for clean rendering logic.

## Git & Workflow
- **Commit Messages:** Follow standard GSD/conventional commit patterns (e.g., `feat:`, `fix:`, `docs:`, `style:`, `chore:`).
- **Branch Strategy:** Work on feature branches or isolation while using GSD workflows.
- **Pull Requests:** Ensure code is linted using `npm run lint` (ESLint) before submission.
