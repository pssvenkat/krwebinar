import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'

// Public pages
import HomePage from './pages/public/HomePage'
import NotFoundPage from './pages/public/NotFoundPage'

// Admin pages (shell only — full implementation in Phase 5+)
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'

// Phase 4: Registration flow (lazy-loaded — keeps initial bundle lean)
const RegisterPage = lazy(() => import('./pages/public/RegisterPage'))
const AttendPage = lazy(() => import('./pages/attend/AttendPage'))
const FeedbackPage = lazy(() => import('./pages/public/FeedbackPage'))

// Dev pages
import DesignSystemPage from './pages/dev/DesignSystemPage'

import { LoadingState } from './components/ui/States'

function PageFallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingState />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* ── Public routes ── */}
          <Route path="/" element={<HomePage />} />

          {/* ── Phase 4: Registration flow ── */}
          <Route path="/register/:webinarId" element={<RegisterPage />} />
          <Route path="/w/:token" element={<AttendPage />} />
          <Route path="/w/:token/feedback" element={<FeedbackPage />} />

          {/* ── Admin routes ── */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            {/* Additional admin routes added in Phase 5+ */}
          </Route>

          {/* ── Dev routes (design system showcase) ── */}
          <Route path="/design-system" element={<DesignSystemPage />} />

          {/* ── Fallbacks ── */}
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
