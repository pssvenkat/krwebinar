import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'

// Public pages
import HomePage from './pages/public/HomePage'
import NotFoundPage from './pages/public/NotFoundPage'
import WebinarLandingPage from './pages/public/WebinarLandingPage'

// Admin pages
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'

// Auth guard & Error Boundary
import RequireAuth from './components/RequireAuth'
import { ErrorBoundary } from './components/ErrorBoundary'

// Phase 4: Registration flow (lazy-loaded)
const RegisterPage            = lazy(() => import('./pages/public/RegisterPage'))
const AttendPage              = lazy(() => import('./pages/attend/AttendPage'))
const FeedbackPage            = lazy(() => import('./pages/public/FeedbackPage'))

// Phase 5: Admin pages (lazy-loaded)
const AdminLoginPage             = lazy(() => import('./pages/admin/AdminLoginPage'))
const AdminWebinarListPage       = lazy(() => import('./pages/admin/AdminWebinarListPage'))
const AdminWebinarFormPage       = lazy(() => import('./pages/admin/AdminWebinarFormPage'))
const AdminWebinarDetailPage     = lazy(() => import('./pages/admin/AdminWebinarDetailPage'))
const AdminWebinarStudioPage     = lazy(() => import('./pages/admin/AdminWebinarStudioPage'))
const AdminRegistrationsPage     = lazy(() => import('./pages/admin/AdminRegistrationsPage'))
const AdminLeadsPage             = lazy(() => import('./pages/admin/AdminLeadsPage'))
// Phase 9: Analytics pages (lazy-loaded)
const AdminAnalyticsPage         = lazy(() => import('./pages/admin/AdminAnalyticsPage'))
const AdminWebinarAnalyticsPage  = lazy(() => import('./pages/admin/AdminWebinarAnalyticsPage'))
// Phase 10: Branding, Trainer & Landing CMS pages (lazy-loaded)
const AdminTrainerPage           = lazy(() => import('./pages/admin/AdminTrainerPage'))
const AdminLandingPageEditor     = lazy(() => import('./pages/admin/AdminLandingPageEditor'))
const AdminBrandingPage          = lazy(() => import('./pages/admin/AdminBrandingPage'))
const AdminProfilePage           = lazy(() => import('./pages/admin/AdminProfilePage'))
const AdminPrivacyPage           = lazy(() => import('./pages/admin/AdminPrivacyPage'))
const AdminUsersPage             = lazy(() => import('./pages/admin/AdminUsersPage'))
// Phase 12 & 14: Platform admin pages (lazy-loaded)
const PlatformLayout             = lazy(() => import('./pages/platform/PlatformLayout'))
const PlatformDashboardPage      = lazy(() => import('./pages/platform/PlatformDashboardPage'))
const PlatformTenantsPage        = lazy(() => import('./pages/platform/PlatformTenantsPage'))
const PlatformTenantFormPage     = lazy(() => import('./pages/platform/PlatformTenantFormPage'))
const PlatformTenantDetailPage   = lazy(() => import('./pages/platform/PlatformTenantDetailPage'))
const PlatformUsersPage          = lazy(() => import('./pages/platform/PlatformUsersPage'))
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
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* ── Public routes ── */}
            <Route path="/" element={<WebinarLandingPage />} />
            <Route path="/landing" element={<WebinarLandingPage />} />
            <Route path="/landing/:id" element={<WebinarLandingPage />} />
            <Route path="/home" element={<HomePage />} />

          {/* ── Registration flow ── */}
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/:webinarId" element={<RegisterPage />} />
          <Route path="/w/:token" element={<AttendPage />} />
          <Route path="/attend/:token" element={<AttendPage />} />
          <Route path="/live/:token" element={<AttendPage />} />
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
            <Route path="webinars/:id/studio" element={<AdminWebinarStudioPage />} />
            <Route path="webinars/:id/edit" element={<AdminWebinarFormPage />} />
            <Route path="webinars/:id/analytics" element={<AdminWebinarAnalyticsPage />} />
            <Route path="registrations" element={<AdminRegistrationsPage />} />
            <Route path="participants" element={<AdminRegistrationsPage />} />
            <Route path="leads" element={<AdminLeadsPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="trainer" element={<AdminTrainerPage />} />
            <Route path="landing-page" element={<AdminLandingPageEditor />} />
            <Route path="landing" element={<AdminLandingPageEditor />} />
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
            <Route path="users" element={<PlatformUsersPage />} />
          </Route>

          {/* ── Dev routes ── */}
          <Route path="/design-system" element={<DesignSystemPage />} />

          {/* ── Fallbacks ── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
