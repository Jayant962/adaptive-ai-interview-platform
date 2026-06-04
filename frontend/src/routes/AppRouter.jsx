import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'
import { InterviewProvider } from '../context/InterviewContext'
import ProtectedRoute from './ProtectedRoute'

// Lazy-loaded pages
const LandingPage    = lazy(() => import('../pages/LandingPage'))
const LoginPage      = lazy(() => import('../pages/LoginPage'))
const SignupPage     = lazy(() => import('../pages/SignupPage'))
const DashboardPage  = lazy(() => import('../pages/DashboardPage'))
const SetupPage      = lazy(() => import('../pages/SetupPage'))
const InterviewPage  = lazy(() => import('../pages/InterviewPage'))
const ReportPage     = lazy(() => import('../pages/ReportPage'))
const ReportsPage    = lazy(() => import('../pages/ReportsPage'))
const HistoryPage    = lazy(() => import('../pages/HistoryPage'))
const ProfilePage    = lazy(() => import('../pages/ProfilePage'))

function PageLoader() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <InterviewProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/"        element={<LandingPage />} />
                <Route path="/login"   element={<LoginPage />} />
                <Route path="/signup"  element={<SignupPage />} />

                {/* Protected routes */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/interview/setup"   element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />
                <Route path="/interview/session" element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
                <Route path="/reports/:sessionId" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </InterviewProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
