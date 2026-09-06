import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  KeyRound,
  Wrench,
  Code2,
  BarChart3,
  ScrollText,
  BookOpen,
  Bell,
  Settings,
  LogOut,
  Webhook,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { CodexMark } from '@/components/CodexLogo';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/api-keys', label: 'API Keys', icon: KeyRound },
  { to: '/webhooks', label: 'Webhooks', icon: Webhook },
  { to: '/tools', label: 'Developer Tools', icon: Wrench },
  { to: '/api-explorer', label: 'API Explorer', icon: Code2 },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/logs', label: 'Request Logs', icon: ScrollText },
  { to: '/docs', label: 'Documentation', icon: BookOpen },
  { to: '/notifications', label: 'Notifications', icon: Bell }
];

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <CodexMark size={30} />
          <span className="font-semibold">Codex</span>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          className="text-text-secondary hover:text-text-primary md:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                isActive
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
              }`
            }
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <NavLink
          to="/settings/account"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary"
        >
          <Settings size={16} aria-hidden="true" />
          Settings
        </NavLink>
        <div className="mt-2 flex items-center justify-between px-3 py-1">
          <span className="truncate text-xs text-text-secondary">{user?.email}</span>
          <button onClick={() => signOut()} aria-label="Sign out" className="text-text-secondary hover:text-danger">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-bg text-text-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-accent-primary focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <CodexMark size={26} />
          <span className="font-semibold">Codex</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="text-text-secondary hover:text-text-primary"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex w-64 flex-col border-r border-border bg-surface">{sidebarContent}</div>
          <button
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
            className="flex-1 bg-black/50"
          />
        </div>
      )}

      <main id="main-content" className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
