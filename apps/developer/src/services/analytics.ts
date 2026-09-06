import { supabase } from '@/lib/supabase';

export interface DashboardSummary {
  totalRequests: number;
  successCount: number;
  failedCount: number;
  errorRate: number;
  activeProjects: number;
  activeApiKeys: number;
}

export interface DailyRequestPoint {
  date: string;
  requests: number;
  errors: number;
}

/** Counts requests over the last N days for projects the current user can see (RLS-scoped). */
export async function getDashboardSummary(days = 30): Promise<DashboardSummary> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: totalRequests }, { count: failedCount }, { count: activeProjects }, { count: activeApiKeys }] =
    await Promise.all([
      supabase.from('request_logs').select('id', { count: 'exact', head: true }).gte('created_at', since),
      supabase
        .from('request_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since)
        .gte('status_code', 400),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('api_keys').select('id', { count: 'exact', head: true }).eq('status', 'active')
    ]);

  const total = totalRequests ?? 0;
  const failed = failedCount ?? 0;

  return {
    totalRequests: total,
    successCount: total - failed,
    failedCount: failed,
    errorRate: total > 0 ? Number(((failed / total) * 100).toFixed(2)) : 0,
    activeProjects: activeProjects ?? 0,
    activeApiKeys: activeApiKeys ?? 0
  };
}

/** Requests-per-day for the last N days, bucketed client-side from request_logs. */
export async function getDailyRequestSeries(days = 14): Promise<DailyRequestPoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('request_logs')
    .select('created_at, status_code')
    .gte('created_at', since);

  if (error) throw error;

  const buckets = new Map<string, { requests: number; errors: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    buckets.set(d.toISOString().slice(0, 10), { requests: 0, errors: 0 });
  }

  for (const row of (data ?? []) as { created_at: string; status_code: number }[]) {
    const key = row.created_at.slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.requests += 1;
    if (row.status_code >= 400) bucket.errors += 1;
  }

  return [...buckets.entries()].map(([date, v]) => ({ date, ...v }));
}
