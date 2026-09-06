import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DeveloperRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  suspended: boolean;
}

async function authedGet<T>(path: string): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Not authenticated.');
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(`${supabaseUrl}/functions/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Request failed.');
  return json.data as T;
}

async function callSuspendFunction(userId: string, action: 'suspend' | 'reinstate'): Promise<{ error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { error: 'Not authenticated.' };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/admin-suspend-user`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, action })
  });
  const json = await res.json();
  if (!res.ok || !json.success) return { error: json?.error?.message ?? 'Request failed.' };
  return { error: null };
}

export default function AdminDevelopersPage() {
  const [developers, setDevelopers] = useState<DeveloperRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await authedGet<{ developers: DeveloperRow[]; total: number }>('/admin-list-developers');
      setDevelopers(data.developers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load developers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSuspend(id: string) {
    if (!confirm('Suspend this developer account? They will be immediately signed out and unable to sign back in.')) return;
    setBusyId(id);
    setError(null);
    const { error } = await callSuspendFunction(id, 'suspend');
    if (error) setError(error);
    else await refresh();
    setBusyId(null);
  }

  async function handleReinstate(id: string) {
    setBusyId(id);
    setError(null);
    const { error } = await callSuspendFunction(id, 'reinstate');
    if (error) setError(error);
    else await refresh();
    setBusyId(null);
  }

  const filtered = developers.filter(
    (d) =>
      d.email.toLowerCase().includes(search.toLowerCase()) ||
      (d.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Developers</h1>
      <p className="mb-6 text-sm text-text-secondary">{developers.length} registered accounts</p>

      <input
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search developers"
        className="mb-4 w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
      />

      {error && (
        <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <p className="text-text-secondary">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-text-secondary">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Joined</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2 text-text-primary">{d.full_name ?? '—'}</td>
                  <td className="px-4 py-2 text-text-secondary">{d.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        d.suspended ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                      }`}
                    >
                      {d.suspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-text-secondary">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    {d.suspended ? (
                      <button
                        onClick={() => handleReinstate(d.id)}
                        disabled={busyId === d.id}
                        className="text-xs text-success hover:underline disabled:opacity-50"
                      >
                        {busyId === d.id ? 'Working…' : 'Reinstate'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSuspend(d.id)}
                        disabled={busyId === d.id}
                        className="text-xs text-danger hover:underline disabled:opacity-50"
                      >
                        {busyId === d.id ? 'Working…' : 'Suspend'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-text-secondary">
        Listed via a service-role Edge Function (admin-list-developers), not a direct client-side query — this
        list, and each row's real suspended/active status, is authoritative regardless of RLS policy details.
      </p>
    </div>
  );
}
