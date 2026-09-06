import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import DashboardLayout from '@/layouts/DashboardLayout';

import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import MfaChallengePage from '@/pages/auth/MfaChallengePage';

import DashboardPage from '@/pages/dashboard/DashboardPage';
import ProjectsListPage from '@/pages/projects/ProjectsListPage';
import ProjectDetailPage from '@/pages/projects/ProjectDetailPage';
import ProjectSettingsPage from '@/pages/projects/ProjectSettingsPage';
import ApiKeysPage from '@/pages/api-keys/ApiKeysPage';
import WebhooksPage from '@/pages/webhooks/WebhooksPage';

import ToolsHubPage from '@/pages/tools/ToolsHubPage';
import JsonToolPage from '@/pages/tools/JsonToolPage';
import Base64ToolPage from '@/pages/tools/Base64ToolPage';
import UuidToolPage from '@/pages/tools/UuidToolPage';
import HashToolPage from '@/pages/tools/HashToolPage';
import TimestampToolPage from '@/pages/tools/TimestampToolPage';
import UrlToolPage from '@/pages/tools/UrlToolPage';
import RegexToolPage from '@/pages/tools/RegexToolPage';
import TextDiffToolPage from '@/pages/tools/TextDiffToolPage';

import ApiExplorerPage from '@/pages/api-explorer/ApiExplorerPage';
import AnalyticsPage from '@/pages/analytics/AnalyticsPage';
import LogsPage from '@/pages/logs/LogsPage';
import DocsPage from '@/pages/docs/DocsPage';
import DocSectionPage from '@/pages/docs/DocSectionPage';
import LandingPage from '@/pages/LandingPage';
import ChangelogPage from '@/pages/docs/ChangelogPage';
import NotificationsPage from '@/pages/notifications/NotificationsPage';
import StatusPage from '@/pages/status/StatusPage';
import AccountSettingsPage from '@/pages/settings/AccountSettingsPage';
import AppearanceSettingsPage from '@/pages/settings/AppearanceSettingsPage';
import SecuritySettingsPage from '@/pages/settings/SecuritySettingsPage';
import NotificationSettingsPage from '@/pages/settings/NotificationSettingsPage';
import DeveloperPreferencesPage from '@/pages/settings/DeveloperPreferencesPage';
import AboutSettingsPage from '@/pages/settings/AboutSettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/signup" element={<SignupPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/mfa-challenge" element={<MfaChallengePage />} />

            <Route path="/status" element={<StatusPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />

                <Route path="/projects" element={<ProjectsListPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/projects/:id/settings" element={<ProjectSettingsPage />} />

                <Route path="/api-keys" element={<ApiKeysPage />} />
                <Route path="/webhooks" element={<WebhooksPage />} />

                <Route path="/tools" element={<ToolsHubPage />} />
                <Route path="/tools/json" element={<JsonToolPage />} />
                <Route path="/tools/base64" element={<Base64ToolPage />} />
                <Route path="/tools/uuid" element={<UuidToolPage />} />
                <Route path="/tools/hash" element={<HashToolPage />} />
                <Route path="/tools/timestamp" element={<TimestampToolPage />} />
                <Route path="/tools/url" element={<UrlToolPage />} />
                <Route path="/tools/regex" element={<RegexToolPage />} />
                <Route path="/tools/diff" element={<TextDiffToolPage />} />

                <Route path="/api-explorer" element={<ApiExplorerPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/logs" element={<LogsPage />} />

                <Route path="/docs" element={<DocsPage />} />
                <Route path="/docs/:slug" element={<DocSectionPage />} />
                <Route path="/changelog" element={<ChangelogPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />

                <Route path="/settings/account" element={<AccountSettingsPage />} />
                <Route path="/settings/appearance" element={<AppearanceSettingsPage />} />
                <Route path="/settings/security" element={<SecuritySettingsPage />} />
                <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
                <Route path="/settings/preferences" element={<DeveloperPreferencesPage />} />
                <Route path="/settings/about" element={<AboutSettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
