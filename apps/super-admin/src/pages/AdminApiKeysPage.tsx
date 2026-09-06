import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  environment: string;
  status: string;
  last_used_at: string | null;
  created_at: string;
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const { data } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, environment, status, last_used_at, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setKeys((data ?? []) as unknown as ApiKeyRow[]);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this API key platform-wide?')) return;
    await supabase.from('api_keys').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', id);
    await refresh();
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">API Keys</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Metadata only — full secrets are never stored and are not visible here.
      </p>

      {loading ? (
        <p className="text-text-secondary">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-text-secondary">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Prefix</th>
                <th className="px-4 py-2">Env</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Last used</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.map((k) => (
                <tr key={k.id}>
                  <td className="px-4 py-2 text-text-primary">{k.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-text-secondary">{k.key_prefix}•••••</td>
                  <td className="px-4 py-2 text-text-secondary">{k.environment}</td>
                  <td className="px-4 py-2">
                    <span className={k.status === 'active' ? 'text-success' : 'text-danger'}>{k.status}</span>
                  </td>
                  <td className="px-4 py-2 text-text-secondary">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'never'}
                  </td>
                  <td className="px-4 py-2">
                    {k.status === 'active' && (
                      <button onClick={() => handleRevoke(k.id)} className="text-xs text-danger hover:underline">
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
