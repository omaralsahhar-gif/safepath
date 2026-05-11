import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Bookings from './pages/Bookings'
import Students from './pages/Students'
import Instructors from './pages/Instructors'
import Progress from './pages/Progress'
import Payments from './pages/Payments'
import { LoadingPage } from './components/UI'

function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-56 pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}

function PrivateRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingPage />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()

  // If stuck loading for any reason, default to login
  if (loading) return <LoadingPage />

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/dashboard" replace /> : <Login />
      } />
      <Route path="/dashboard" element={
        <PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>
      } />
      <Route path="/bookings" element={
        <PrivateRoute><Layout><Bookings /></Layout></PrivateRoute>
      } />
      <Route path="/students" element={
        <PrivateRoute allowedRoles={['manager','instructor']}>
          <Layout><Students /></Layout>
        </PrivateRoute>
      } />
      <Route path="/instructors" element={
        <PrivateRoute allowedRoles={['manager']}>
          <Layout><Instructors /></Layout>
        </PrivateRoute>
      } />
      <Route path="/progress" element={
        <PrivateRoute><Layout><Progress /></Layout></PrivateRoute>
      } />
      <Route path="/payments" element={
        <PrivateRoute allowedRoles={['manager','student']}>
          <Layout><Payments /></Layout>
        </PrivateRoute>
      } />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
