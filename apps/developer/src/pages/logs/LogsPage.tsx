import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RequestLog } from '@/types/database';

export default function LogsPage() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('request_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) setError(error.message);
      else setLogs((data ?? []) as unknown as RequestLog[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Request Logs</h1>
      <p className="mb-6 text-sm text-text-secondary">Most recent 100 requests across your projects</p>

      {error && <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>}

      {loading ? (
        <p className="text-text-secondary">Loading…</p>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-text-secondary">
          No requests logged yet. Make a call from the API Explorer to see it here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-text-secondary">
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Endpoint</th>
                <th className="px-4 py-2">Method</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Env</th>
                <th className="px-4 py-2">Duration</th>
                <th className="px-4 py-2">Request ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-text-secondary">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-text-primary">{log.endpoint}</td>
                  <td className="px-4 py-2 text-text-secondary">{log.method}</td>
                  <td className={`px-4 py-2 ${log.status_code >= 400 ? 'text-danger' : 'text-success'}`}>
                    {log.status_code}
                  </td>
                  <td className="px-4 py-2 text-text-secondary">{log.environment}</td>
                  <td className="px-4 py-2 text-text-secondary">{log.response_time_ms}ms</td>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-text-secondary">
                    {log.request_id}
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
