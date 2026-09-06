import { useEffect, useState, type FormEvent } from 'react';
import { TriangleAlert, Copy, Check, Zap } from 'lucide-react';
import { listMyProjects } from '@/services/projects';
import {
  listWebhooks,
  createWebhook,
  updateWebhookStatus,
  deleteWebhook,
  testWebhook,
  AVAILABLE_EVENTS,
  type Webhook
} from '@/services/webhooks';
import type { Project } from '@/types/database';

export default function WebhooksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const p = await listMyProjects();
      setProjects(p);
      if (p.length > 0) setProjectId(p[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!projectId) return;
    listWebhooks(projectId).then(setWebhooks).catch((e) => setError(e.message));
  }, [projectId]);

  function toggleEvent(evt: string) {
    setSelectedEvents((prev) => (prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !url.trim() || selectedEvents.length === 0) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createWebhook({ projectId, url: url.trim(), events: selectedEvents });
      setRevealedSecret(created.signing_secret);
      setUrl('');
      setSelectedEvents([]);
      setWebhooks(await listWebhooks(projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create webhook.');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(w: Webhook) {
    await updateWebhookStatus(w.id, w.status === 'active' ? 'disabled' : 'active');
    setWebhooks(await listWebhooks(projectId));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this webhook?')) return;
    await deleteWebhook(id);
    setWebhooks(await listWebhooks(projectId));
  }

  async function handleTest(id: string) {
    setTestResult((prev) => ({ ...prev, [id]: 'sending' }));
    try {
      const result = await testWebhook(id);
      setTestResult((prev) => ({
        ...prev,
        [id]: `${result.delivery_status} (${result.response_status_code ?? 'no response'})`
      }));
    } catch (e) {
      setTestResult((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : 'failed' }));
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
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Webhooks</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Codex signs every delivery with HMAC-SHA256 in the <code>X-Codex-Signature</code> header.
      </p>

      {loading ? (
        <p className="text-text-secondary">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-text-secondary">Create a project first.</p>
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
                <p className="text-sm font-medium">Copy this signing secret now — it won't be shown again.</p>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-bg px-3 py-2 font-mono text-sm text-text-primary">
                <span className="flex-1 truncate">{revealedSecret}</span>
                <button onClick={copySecret} className="text-text-secondary hover:text-text-primary">
                  {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                </button>
              </div>
              <button onClick={() => setRevealedSecret(null)} className="mt-3 text-xs text-text-secondary hover:text-text-primary">
                I've saved it — dismiss
              </button>
            </div>
          )}

          <form onSubmit={handleCreate} className="mb-6 space-y-3 rounded-lg border border-border bg-surface p-4">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Endpoint URL</label>
              <input
                required
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourapp.com/webhooks/codex"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Events</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_EVENTS.map((evt) => (
                  <button
                    type="button"
                    key={evt}
                    onClick={() => toggleEvent(evt)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      selectedEvents.includes(evt)
                        ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                        : 'border-border text-text-secondary'
                    }`}
                  >
                    {evt}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={creating || selectedEvents.length === 0}
              className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create webhook'}
            </button>
          </form>

          {error && <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>}

          <div className="divide-y divide-border rounded-lg border border-border bg-surface">
            {webhooks.length === 0 && <p className="p-4 text-sm text-text-secondary">No webhooks for this project yet.</p>}
            {webhooks.map((w) => (
              <div key={w.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-text-primary">{w.url}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">{w.events.join(', ')}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        w.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {w.status}
                    </span>
                    <button onClick={() => handleTest(w.id)} className="flex items-center gap-1 text-xs text-accent-secondary hover:underline">
                      <Zap size={12} /> Test
                    </button>
                    <button onClick={() => handleToggleStatus(w)} className="text-xs text-text-secondary hover:underline">
                      {w.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDelete(w.id)} className="text-xs text-danger hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
                {testResult[w.id] && <p className="mt-1 text-xs text-text-secondary">Last test: {testResult[w.id]}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
