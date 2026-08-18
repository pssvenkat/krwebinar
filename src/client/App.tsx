import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'

// Public pages
import HomePage from './pages/public/HomePage'
import NotFoundPage from './pages/public/NotFoundPage'

// Admin pages
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'

// Auth guard
import RequireAuth from './components/RequireAuth'

// Phase 4: Registration flow (lazy-loaded)
const RegisterPage   = lazy(() => import('./pages/public/RegisterPage'))
const AttendPage     = lazy(() => import('./pages/attend/AttendPage'))
const FeedbackPage   = lazy(() => import('./pages/public/FeedbackPage'))

// Phase 5: Admin pages (lazy-loaded)
const AdminLoginPage        = lazy(() => import('./pages/admin/AdminLoginPage'))
const AdminWebinarListPage  = lazy(() => import('./pages/admin/AdminWebinarListPage'))
const AdminWebinarFormPage  = lazy(() => import('./pages/admin/AdminWebinarFormPage'))
const AdminWebinarDetailPage = lazy(() => import('./pages/admin/AdminWebinarDetailPage'))

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

          {/* ── Admin login (unguarded) ── */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* ── Admin routes (auth-guarded) ── */}
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="webinars" element={<AdminWebinarListPage />} />
            <Route path="webinars/new" element={<AdminWebinarFormPage />} />
            <Route path="webinars/:id" element={<AdminWebinarDetailPage />} />
            <Route path="webinars/:id/edit" element={<AdminWebinarFormPage />} />
          </Route>

          {/* ── Dev routes ── */}
          <Route path="/design-system" element={<DesignSystemPage />} />

          {/* ── Fallbacks ── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
