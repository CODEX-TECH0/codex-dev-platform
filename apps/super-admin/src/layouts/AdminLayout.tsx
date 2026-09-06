import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  KeyRound,
  ScrollText,
  ShieldCheck,
  Megaphone,
  History,
  Activity,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAdminAuth } from '@/features/auth/AdminAuthContext';
import { CodexMark } from '@/components/CodexLogo';

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/developers', label: 'Developers', icon: Users },
  { to: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { to: '/admin/api-keys', label: 'API Keys', icon: KeyRound },
  { to: '/admin/logs', label: 'Logs', icon: ScrollText },
  { to: '/admin/audit', label: 'Audit Log', icon: ShieldCheck },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/changelog', label: 'Changelog', icon: History },
  { to: '/admin/status', label: 'Status Page', icon: Activity }
];

export default function AdminLayout() {
  const { user, signOut } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <CodexMark size={30} />
          <span className="font-semibold">Codex Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          className="text-text-secondary hover:text-text-primary md:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Admin navigation">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
        <div className="flex items-center justify-between px-3 py-1">
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

      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        {sidebarContent}
      </aside>

      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <CodexMark size={26} />
          <span className="font-semibold">Codex Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="text-text-secondary hover:text-text-primary"
        >
          <Menu size={22} />
        </button>
      </div>

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
