import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Public pages
import HomePage from './pages/public/HomePage'
import NotFoundPage from './pages/public/NotFoundPage'

// Admin pages (shell only — full implementation in Phase 3+)
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={<HomePage />} />

        {/* ── Webinar routes (Phases 7–10) ── */}
        {/* <Route path="/webinars" element={<WebinarsPage />} /> */}
        {/* <Route path="/register/:token" element={<RegisterPage />} /> */}
        {/* <Route path="/w/:token" element={<WebinarAccessPage />} /> */}

        {/* ── Admin routes ── */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          {/* Additional admin routes added in Phase 3+ */}
        </Route>

        {/* ── Platform admin routes (Phase 3+) ── */}
        {/* <Route path="/platform" element={<PlatformLayout />}> */}

        {/* ── Fallbacks ── */}
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
