import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from '@/features/auth/AdminAuthContext';
import { RequireSuperAdmin } from '@/features/auth/RequireSuperAdmin';
import AdminLayout from '@/layouts/AdminLayout';

import AdminLoginPage from '@/pages/AdminLoginPage';
import AdminMfaChallengePage from '@/pages/AdminMfaChallengePage';
import AdminOverviewPage from '@/pages/AdminOverviewPage';
import AdminDevelopersPage from '@/pages/AdminDevelopersPage';
import AdminProjectsPage from '@/pages/AdminProjectsPage';
import AdminApiKeysPage from '@/pages/AdminApiKeysPage';
import AdminLogsPage from '@/pages/AdminLogsPage';
import AdminAuditPage from '@/pages/AdminAuditPage';
import AdminAnnouncementsPage from '@/pages/AdminAnnouncementsPage';
import AdminChangelogPage from '@/pages/AdminChangelogPage';
import AdminStatusPage from '@/pages/AdminStatusPage';

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/admin-mfa-challenge" element={<AdminMfaChallengePage />} />

          <Route element={<RequireSuperAdmin />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminOverviewPage />} />
              <Route path="/admin/developers" element={<AdminDevelopersPage />} />
              <Route path="/admin/projects" element={<AdminProjectsPage />} />
              <Route path="/admin/api-keys" element={<AdminApiKeysPage />} />
              <Route path="/admin/logs" element={<AdminLogsPage />} />
              <Route path="/admin/audit" element={<AdminAuditPage />} />
              <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
              <Route path="/admin/changelog" element={<AdminChangelogPage />} />
              <Route path="/admin/status" element={<AdminStatusPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
