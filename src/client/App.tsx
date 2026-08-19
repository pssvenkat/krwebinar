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
const AdminLoginPage             = lazy(() => import('./pages/admin/AdminLoginPage'))
const AdminWebinarListPage       = lazy(() => import('./pages/admin/AdminWebinarListPage'))
const AdminWebinarFormPage       = lazy(() => import('./pages/admin/AdminWebinarFormPage'))
const AdminWebinarDetailPage     = lazy(() => import('./pages/admin/AdminWebinarDetailPage'))
const AdminRegistrationsPage     = lazy(() => import('./pages/admin/AdminRegistrationsPage'))
const AdminLeadsPage             = lazy(() => import('./pages/admin/AdminLeadsPage'))
// Phase 9: Analytics pages (lazy-loaded)
const AdminAnalyticsPage         = lazy(() => import('./pages/admin/AdminAnalyticsPage'))
const AdminWebinarAnalyticsPage  = lazy(() => import('./pages/admin/AdminWebinarAnalyticsPage'))
// Phase 10: Branding page (lazy-loaded)
const AdminBrandingPage          = lazy(() => import('./pages/admin/AdminBrandingPage'))
const AdminProfilePage           = lazy(() => import('./pages/admin/AdminProfilePage'))
const AdminPrivacyPage           = lazy(() => import('./pages/admin/AdminPrivacyPage'))
// Phase 12 & 14: Platform admin pages (lazy-loaded)
const PlatformLayout             = lazy(() => import('./pages/platform/PlatformLayout'))
const PlatformDashboardPage      = lazy(() => import('./pages/platform/PlatformDashboardPage'))
const PlatformTenantsPage        = lazy(() => import('./pages/platform/PlatformTenantsPage'))
const PlatformTenantFormPage     = lazy(() => import('./pages/platform/PlatformTenantFormPage'))
const PlatformTenantDetailPage   = lazy(() => import('./pages/platform/PlatformTenantDetailPage'))
// Phase 13: Domains page (lazy-loaded)
const AdminDomainsPage           = lazy(() => import('./pages/admin/AdminDomainsPage'))

// Dev pages
import DesignSystemPage from './pages/dev/DesignSystemPage'

import { LoadingState } from './components/ui/States'
import { useBranding } from './hooks/useBranding'

function PageFallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingState />
    </div>
  )
}

export default function App() {
  // Phase 10: Apply tenant branding CSS variables globally
  useBranding()

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
            <Route path="webinars/:id/analytics" element={<AdminWebinarAnalyticsPage />} />
            <Route path="registrations" element={<AdminRegistrationsPage />} />
            <Route path="participants" element={<AdminRegistrationsPage />} />
            <Route path="leads" element={<AdminLeadsPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="profile" element={<AdminProfilePage />} />
            <Route path="branding" element={<AdminBrandingPage />} />
            <Route path="domains" element={<AdminDomainsPage />} />
            <Route path="privacy" element={<AdminPrivacyPage />} />
          </Route>

          {/* ── Phase 12 & 14: Platform admin routes (PLATFORM_OWNER) ── */}
          <Route
            path="/platform"
            element={
              <RequireAuth>
                <PlatformLayout />
              </RequireAuth>
            }
          >
            <Route index element={<PlatformDashboardPage />} />
            <Route path="tenants" element={<PlatformTenantsPage />} />
            <Route path="tenants/new" element={<PlatformTenantFormPage />} />
            <Route path="tenants/:id" element={<PlatformTenantDetailPage />} />
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
