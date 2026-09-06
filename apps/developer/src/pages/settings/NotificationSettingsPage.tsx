import { useEffect, useState } from 'react';
import { SettingsTabs } from '@/components/SettingsTabs';
import { useAuth } from '@/features/auth/AuthContext';
import { getPreferences, savePreferences, type UserPreferences } from '@/services/preferences';

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-accent-primary' : 'bg-border'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-5' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getPreferences(user.id)
      .then(setPrefs)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load preferences.'))
      .finally(() => setLoading(false));
  }, [user]);

  async function update(field: keyof UserPreferences, value: boolean) {
    if (!user || !prefs) return;
    const next = { ...prefs, [field]: value };
    setPrefs(next);
    try {
      await savePreferences(user.id, { [field]: value });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
      setPrefs(prefs);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Settings</h1>
      <SettingsTabs />

      <h2 className="mb-1 text-lg font-medium text-text-primary">Notifications &amp; Privacy</h2>
      <p className="mb-4 text-sm text-text-secondary">Control what Codex emails you and what it shows in-app.</p>

      {error && <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>}

      {loading || !prefs ? (
        <p className="text-text-secondary">Loading…</p>
      ) : (
        <div className="max-w-md divide-y divide-border rounded-lg border border-border bg-surface px-4">
          <Toggle
            checked={prefs.email_product_updates}
            onChange={(v) => update('email_product_updates', v)}
            label="Product update emails"
            description="New features, API changes, changelog highlights"
          />
          <Toggle
            checked={prefs.email_security_alerts}
            onChange={(v) => update('email_security_alerts', v)}
            label="Security alert emails"
            description="Account security events. Recommended to keep on."
          />
          <Toggle
            checked={prefs.in_app_announcements}
            onChange={(v) => update('in_app_announcements', v)}
            label="In-app announcements"
            description="Show admin announcements in your Notifications page"
          />
          <Toggle
            checked={prefs.analytics_opt_in}
            onChange={(v) => update('analytics_opt_in', v)}
            label="Product analytics"
            description="Help improve Codex by sharing anonymous usage patterns"
          />
        </div>
      )}
    </div>
  );
}
