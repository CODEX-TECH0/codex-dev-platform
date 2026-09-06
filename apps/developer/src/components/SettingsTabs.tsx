import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/settings/account', label: 'Account' },
  { to: '/settings/appearance', label: 'Appearance' },
  { to: '/settings/security', label: 'Security' },
  { to: '/settings/notifications', label: 'Notifications' },
  { to: '/settings/preferences', label: 'Developer Preferences' },
  { to: '/settings/about', label: 'About' }
];

export function SettingsTabs() {
  return (
    <nav aria-label="Settings sections" className="mb-6 flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `border-b-2 px-3 py-2 text-sm transition ${
              isActive
                ? 'border-accent-primary text-accent-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
