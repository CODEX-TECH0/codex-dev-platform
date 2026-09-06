import { useEffect, useState } from 'react';
import { SettingsTabs } from '@/components/SettingsTabs';
import { useAuth } from '@/features/auth/AuthContext';
import { getPreferences, savePreferences, type UserPreferences } from '@/services/preferences';
import { listMyProjects } from '@/services/projects';
import type { Project } from '@/types/database';

export default function DeveloperPreferencesPage() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getPreferences(user.id), listMyProjects()])
      .then(([p, projs]) => {
        setPrefs(p);
        setProjects(projs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load preferences.'))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleSave() {
    if (!user || !prefs) return;
    setError(null);
    try {
      await savePreferences(user.id, {
        default_project_id: prefs.default_project_id,
        api_explorer_default_environment: prefs.api_explorer_default_environment
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Settings</h1>
      <SettingsTabs />

      <h2 className="mb-1 text-lg font-medium text-text-primary">Developer Preferences</h2>
      <p className="mb-4 text-sm text-text-secondary">Defaults used across the dashboard and API Explorer.</p>

      {error && <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>}

      {loading || !prefs ? (
        <p className="text-text-secondary">Loading…</p>
      ) : (
        <div className="max-w-md space-y-4 rounded-lg border border-border bg-surface p-4">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Default project</label>
            <select
              value={prefs.default_project_id ?? ''}
              onChange={(e) => setPrefs({ ...prefs, default_project_id: e.target.value || null })}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
            >
              <option value="">No default (always ask)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-secondary">Pre-selected when creating an API key or webhook.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-text-secondary">API Explorer default environment</label>
            <select
              value={prefs.api_explorer_default_environment}
              onChange={(e) =>
                setPrefs({ ...prefs, api_explorer_default_environment: e.target.value as 'test' | 'live' })
              }
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
            >
              <option value="test">Test</option>
              <option value="live">Live</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white"
          >
            {saved ? 'Saved' : 'Save preferences'}
          </button>
        </div>
      )}
    </div>
  );
}
