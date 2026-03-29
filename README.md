# TaskPilotAI

TaskPilotAI is an AI-powered enterprise task management and team collaboration platform. It combines traditional task tracking with intelligent AI insights to boost productivity and streamline workflows.

## 🚀 Features

- **AI Task Insights**: Automatic task prioritization and summaries using Gemini AI.
- **Real-time Collaboration**: Live chat and task updates powered by Socket.io.
- **Enterprise Dashboard**: Comprehensive analytics on team performance, workload, and project progress.
- **Kanban & Calendar Views**: Flexible task management views for better visualization.
- **Dynamic Onboarding**: Smooth user registration and workspace setup flow.
- **Responsive Design**: Premium UI built with React and Tailwind CSS.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, Shadcn UI.
- **Backend**: Node.js, Express, Socket.io.
- **Database**: MongoDB (Mongoose).
- **AI**: Google Gemini Pro API.
- **State Management**: React Context API.

## 📦 Setup Instructions

### Prerequisites

- Node.js (v18+)
- MongoDB (Local or Atlas)
- Gemini API Key

### Server Setup

1. Navigate to the server directory:
   ```bash
   cd frontend/server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.production.example`:
   ```bash
   MONGODB_URI=your_mongodb_uri
   GEMINI_API_KEY=your_api_key
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```
4. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 🌐 Deployment

### Frontend (Vercel/Netlify)

- Build the project: `npm run build`
- Deploy the `dist` folder.
- Ensure `VITE_API_URL` environment variable points to your backend.

### Backend (Render/Heroku/Railway)

- Set environment variables in the hosting platform.
- The entry point is `frontend/server/server.js`.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
