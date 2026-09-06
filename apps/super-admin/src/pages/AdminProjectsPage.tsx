import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ProjectRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  organization_id: string;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, slug, status, created_at, organization_id')
        .order('created_at', { ascending: false })
        .limit(200);
      setProjects((data ?? []) as unknown as ProjectRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Projects</h1>
      <p className="mb-6 text-sm text-text-secondary">{projects.length} projects across all organizations</p>

      {loading ? (
        <p className="text-text-secondary">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-text-secondary">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-text-primary">{p.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-text-secondary">{p.slug}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-text-secondary">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
