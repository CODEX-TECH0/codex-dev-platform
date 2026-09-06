import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject, renameProject } from '@/services/projects';
import { listApiKeysForProject } from '@/services/apiKeys';
import type { Project, ApiKey } from '@/types/database';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [p, k] = await Promise.all([getProject(id), listApiKeysForProject(id)]);
      setProject(p);
      setName(p?.name ?? '');
      setKeys(k);
      setLoading(false);
    })();
  }, [id]);

  async function handleRename() {
    if (!id || !name.trim()) return;
    await renameProject(id, name.trim());
    setRenaming(false);
    setProject((p) => (p ? { ...p, name: name.trim() } : p));
  }

  if (loading) return <div className="p-6 text-text-secondary">Loading project…</div>;
  if (!project) return <div className="p-6 text-text-secondary">Project not found.</div>;

  return (
    <div className="p-6">
      {renaming ? (
        <div className="mb-1 flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-bg px-2 py-1 text-xl font-semibold text-text-primary outline-none focus:border-accent-primary"
          />
          <button onClick={handleRename} className="text-sm text-accent-primary">
            Save
          </button>
          <button onClick={() => setRenaming(false)} className="text-sm text-text-secondary">
            Cancel
          </button>
        </div>
      ) : (
        <h1 className="mb-1 flex items-center gap-3 text-2xl font-semibold text-text-primary">
          {project.name}
          <button onClick={() => setRenaming(true)} className="text-sm font-normal text-accent-secondary">
            rename
          </button>
          <Link to={`/projects/${project.id}/settings`} className="text-sm font-normal text-accent-secondary">
            settings
          </Link>
        </h1>
      )}
      <p className="mb-6 text-sm text-text-secondary">
        {project.slug} · status: {project.status}
      </p>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary">API Keys</h2>
        <Link to="/api-keys" state={{ projectId: project.id }} className="text-sm text-accent-primary">
          Manage keys →
        </Link>
      </div>

      {keys.length === 0 ? (
        <p className="text-sm text-text-secondary">No API keys yet for this project.</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-surface">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-text-primary">{k.name}</p>
                <p className="font-mono text-xs text-text-secondary">
                  {k.key_prefix}••••••••• · {k.environment}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  k.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                }`}
              >
                {k.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
