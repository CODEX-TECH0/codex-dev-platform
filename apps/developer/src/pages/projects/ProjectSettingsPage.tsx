import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getProject, deleteProject, updateProjectSettings } from '@/services/projects';
import type { Project } from '@/types/database';

const STATUSES = ['active', 'archived', 'suspended'] as const;

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('active');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getProject(id).then((p) => {
      setProject(p);
      setDescription(p?.description ?? '');
      setStatus((p?.status as typeof status) ?? 'active');
      setLoading(false);
    });
  }, [id]);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await updateProjectSettings(id, { description, status });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm('Delete this project permanently? This also removes its API keys and webhooks.')) return;
    await deleteProject(id);
    navigate('/projects', { replace: true });
  }

  if (loading) return <div className="p-6 text-text-secondary">Loading…</div>;
  if (!project) return <div className="p-6 text-text-secondary">Project not found.</div>;

  return (
    <div className="p-6">
      <Link to={`/projects/${id}`} className="mb-2 inline-block text-sm text-accent-secondary hover:underline">
        ← Back to {project.name}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold text-text-primary">Project Settings</h1>

      <div className="max-w-lg space-y-4 rounded-lg border border-border bg-surface p-4">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-24 w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-text-secondary">
            API keys on a non-active project will be rejected by every /v1 endpoint (PROJECT_INACTIVE).
          </p>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saved ? 'Saved' : saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div className="mt-8 max-w-lg rounded-lg border border-danger/40 bg-danger/5 p-4">
        <h2 className="mb-1 text-sm font-medium text-danger">Danger zone</h2>
        <p className="mb-3 text-sm text-text-secondary">
          Deleting a project also deletes its API keys, webhooks, and usage history. This cannot be undone.
        </p>
        <button onClick={handleDelete} className="rounded-md border border-danger px-4 py-2 text-sm text-danger hover:bg-danger/10">
          Delete project
        </button>
      </div>
    </div>
  );
}
