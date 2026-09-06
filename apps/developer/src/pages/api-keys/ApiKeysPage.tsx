import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Copy, Check, TriangleAlert } from 'lucide-react';
import { listMyProjects } from '@/services/projects';
import { listApiKeysForProject, createApiKey, revokeApiKey, rotateApiKey } from '@/services/apiKeys';
import type { Project, ApiKey } from '@/types/database';

export default function ApiKeysPage() {
  const location = useLocation();
  const preselected = (location.state as { projectId?: string })?.projectId;

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>(preselected ?? '');
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<'test' | 'live'>('test');
  const [scopesInput, setScopesInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await listMyProjects();
      setProjects(p);
      if (!projectId && p.length > 0) setProjectId(p[0].id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!projectId) return;
    listApiKeysForProject(projectId).then(setKeys).catch((e) => setError(e.message));
  }, [projectId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const scopes = scopesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const created = await createApiKey({ projectId, name: name.trim(), environment, scopes });
      setRevealedSecret(created.secret);
      setName('');
      setScopesInput('');
      setKeys(await listApiKeysForProject(projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create API key.');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this key? Requests using it will start failing immediately.')) return;
    setBusyId(id);
    try {
      await revokeApiKey(id);
      setKeys(await listApiKeysForProject(projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke key.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRotate(id: string) {
    if (!confirm('Rotate this key? The current secret will stop working immediately and a new one will be issued.')) return;
    setBusyId(id);
    setError(null);
    try {
      const rotated = await rotateApiKey(id);
      setRevealedSecret(rotated.secret);
      setKeys(await listApiKeysForProject(projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rotate key.');
    } finally {
      setBusyId(null);
    }
  }

  function copySecret() {
    if (!revealedSecret) return;
    navigator.clipboard.writeText(revealedSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">API Keys</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Test keys (<code>cx_test_…</code>) are sandboxed. Live keys (<code>cx_live_…</code>) hit production.
      </p>

      {loading ? (
        <p className="text-text-secondary">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-text-secondary">Create a project first before generating an API key.</p>
      ) : (
        <>
          <div className="mb-6 flex items-center gap-3">
            <label className="text-sm text-text-secondary">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {revealedSecret && (
            <div className="mb-6 rounded-lg border border-warning/40 bg-warning/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-warning">
                <TriangleAlert size={16} />
                <p className="text-sm font-medium">Copy this secret now — it won't be shown again.</p>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-bg px-3 py-2 font-mono text-sm text-text-primary">
                <span className="flex-1 truncate">{revealedSecret}</span>
                <button onClick={copySecret} aria-label="Copy secret" className="text-text-secondary hover:text-text-primary">
                  {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                </button>
              </div>
              <button
                onClick={() => setRevealedSecret(null)}
                className="mt-3 text-xs text-text-secondary hover:text-text-primary"
              >
                I've saved it — dismiss
              </button>
            </div>
          )}

          <form onSubmit={handleCreate} className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Key name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production backend"
                className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as 'test' | 'live')}
                className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
              >
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Scopes (optional, comma-separated)</label>
              <input
                value={scopesInput}
                onChange={(e) => setScopesInput(e.target.value)}
                placeholder="defaults to * (full access)"
                className="w-56 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create key'}
            </button>
          </form>

          {error && (
            <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>
          )}

          <div className="divide-y divide-border rounded-lg border border-border bg-surface">
            {keys.length === 0 && <p className="p-4 text-sm text-text-secondary">No keys for this project yet.</p>}
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-text-primary">{k.name}</p>
                  <p className="font-mono text-xs text-text-secondary">
                    {k.key_prefix}••••••••• · {k.environment} · created{' '}
                    {new Date(k.created_at).toLocaleDateString()}
                    {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}` : ' · never used'}
                  </p>
                  {k.scopes && k.scopes.length > 0 && !k.scopes.includes('*') && (
                    <p className="mt-0.5 text-xs text-text-secondary">scopes: {k.scopes.join(', ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      k.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    }`}
                  >
                    {k.status}
                  </span>
                  {k.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleRotate(k.id)}
                        disabled={busyId === k.id}
                        className="text-xs text-accent-secondary hover:underline disabled:opacity-50"
                      >
                        {busyId === k.id ? 'Working…' : 'Rotate'}
                      </button>
                      <button
                        onClick={() => handleRevoke(k.id)}
                        disabled={busyId === k.id}
                        className="text-xs text-danger hover:underline disabled:opacity-50"
                      >
                        {busyId === k.id ? 'Working…' : 'Revoke'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
