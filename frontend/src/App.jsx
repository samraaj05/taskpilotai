import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as SonnerToaster } from 'sonner';
import { Toaster } from "@/components/ui/toaster";

// Providers
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { BackendModeProvider } from './context/BackendModeContext';
import { NotificationProvider } from './context/NotificationContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { QueryProvider } from './providers/QueryProvider';

// Components
import Layout from './Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Loading Fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-slate-900">
    <div className="relative w-16 h-16 animate-spin rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-cyan-500 border-l-transparent"></div>
  </div>
);

// Pages
const Dashboard = lazy(() => import('./Pages/Dashboard'));
const Projects = lazy(() => import('./Pages/Projects'));
const Tasks = lazy(() => import('./Pages/Tasks'));
const Team = lazy(() => import('./Pages/Team'));
const Analytics = lazy(() => import('./Pages/Analytics'));
const Activity = lazy(() => import('./Pages/Activity'));
const AIInsights = lazy(() => import('./Pages/AIInsights'));
const AICommandCenter = lazy(() => import('./Pages/AICommandCenter'));
const Workspaces = lazy(() => import('./Pages/Workspaces'));
const Settings = lazy(() => import('./Pages/Settings'));
const Login = lazy(() => import('./Pages/Login'));
const Signup = lazy(() => import('./Pages/Signup'));
const InviteRegistration = lazy(() => import('./Pages/InviteRegistration'));
const Unauthorized = lazy(() => import('./Pages/Unauthorized'));

export default function App() {
  return (
    <ErrorBoundary>
      <BackendModeProvider>
        <QueryProvider>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              <WorkspaceProvider>
                <BrowserRouter>
                  <SonnerToaster richColors position="top-right" />
                  <Toaster />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/invite/:token" element={<InviteRegistration />} />
                      <Route path="/unauthorized" element={<Unauthorized />} />

                      {/* Protected Routes */}
                      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/projects" element={<Projects />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/team" element={<Team />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/activity" element={<Activity />} />
                        <Route path="/insights" element={<AIInsights />} />
                        <Route path="/ai-command" element={<AICommandCenter />} />
                        <Route path="/workspaces" element={<Workspaces />} />
                        <Route path="/settings" element={<Settings />} />
                      </Route>

                      {/* Fallback */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </WorkspaceProvider>
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
        </QueryProvider>
      </BackendModeProvider>
    </ErrorBoundary>
  );
}
