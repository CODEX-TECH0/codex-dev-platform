import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { listMyProjects, createProject, deleteProject, getOrCreateDefaultOrganization } from '@/services/projects';
import type { Project } from '@/types/database';

export default function ProjectsListPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setProjects(await listMyProjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const orgId = await getOrCreateDefaultOrganization(user.email ?? 'user');
      await createProject({ organizationId: orgId, name: name.trim(), createdBy: user.id });
      setName('');
      setShowCreate(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await deleteProject(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete project.');
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Projects</h1>
          <p className="text-sm text-text-secondary">Organize your API keys and usage by project</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-accent-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> New project
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 flex gap-2 rounded-lg border border-border bg-surface p-4">
          <input
            autoFocus
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-text-primary outline-none focus:border-accent-primary"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-surface" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <FolderKanban size={28} className="mb-3 text-text-secondary" />
          <p className="text-text-primary">No projects yet</p>
          <p className="mt-1 text-sm text-text-secondary">Create your first project to get an API key.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-surface">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <Link to={`/projects/${p.id}`} className="min-w-0">
                <p className="truncate font-medium text-text-primary">{p.name}</p>
                <p className="text-xs text-text-secondary">
                  {p.slug} · {p.status}
                </p>
              </Link>
              <button
                onClick={() => handleDelete(p.id)}
                aria-label={`Delete ${p.name}`}
                className="text-text-secondary hover:text-danger"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
