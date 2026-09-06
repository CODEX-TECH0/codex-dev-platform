import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/lib/supabase';

interface Summary {
  totalDevelopers: number;
  totalProjects: number;
  totalApiKeys: number;
  totalRequests30d: number;
  errorRate30d: number;
}

async function fetchDeveloperTotal(): Promise<number> {
  // Sources from the same admin-list-developers function the Developers
  // page itself uses (service role, excludes admin_roles accounts), rather
  // than a separate raw `profiles` count here — the two counts disagreeing
  // was a real, confirmed bug (the raw count included Super Admin accounts,
  // which the Developers page correctly excludes).
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return 0;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/admin-list-developers`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const json = await res.json();
    if (!res.ok || !json.success) return 0;
    return (json.data.total as number) ?? 0;
  } catch {
    return 0;
  }
}

export default function AdminOverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<{ date: string; requests: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [developers, { count: projects }, { count: apiKeys }, { data: logs }] = await Promise.all([
        fetchDeveloperTotal(),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('api_keys').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('request_logs').select('created_at, status_code').gte('created_at', since)
      ]);

      const total = logs?.length ?? 0;
      const failed = (logs ?? []).filter((l) => (l as { status_code: number }).status_code >= 400).length;

      setSummary({
        totalDevelopers: developers,
        totalProjects: projects ?? 0,
        totalApiKeys: apiKeys ?? 0,
        totalRequests30d: total,
        errorRate30d: total > 0 ? Number(((failed / total) * 100).toFixed(2)) : 0
      });

      const buckets = new Map<string, number>();
      for (let i = 13; i >= 0; i--) {
        buckets.set(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), 0);
      }
      for (const row of (logs ?? []) as { created_at: string }[]) {
        const key = row.created_at.slice(0, 10);
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
      setSeries([...buckets.entries()].map(([date, requests]) => ({ date, requests })));

      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Platform Overview</h1>
      <p className="mb-6 text-sm text-text-secondary">Codex V1 — all organizations</p>

      {loading || !summary ? (
        <p className="text-text-secondary">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <Stat label="Developers" value={summary.totalDevelopers} />
            <Stat label="Projects" value={summary.totalProjects} />
            <Stat label="Active API keys" value={summary.totalApiKeys} />
            <Stat label="Requests (30d)" value={summary.totalRequests30d} />
            <Stat label="Error rate (30d)" value={`${summary.errorRate30d}%`} />
          </div>

          <div className="mt-6 rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-4 text-sm font-medium text-text-secondary">Platform-wide requests, last 14 days</h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="adminReq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#263241" />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#151B23', border: '1px solid #263241', borderRadius: 8 }} />
                <Area type="monotone" dataKey="requests" stroke="#3B82F6" fill="url(#adminReq)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}
