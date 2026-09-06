import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface LogRow {
  id: string;
  request_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  environment: string;
  created_at: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('request_logs')
        .select('id, request_id, endpoint, method, status_code, response_time_ms, environment, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      setLogs((data ?? []) as unknown as LogRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Request Logs</h1>
      <p className="mb-6 text-sm text-text-secondary">Most recent 200 requests, platform-wide</p>

      {loading ? (
        <p className="text-text-secondary">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-text-secondary">
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Endpoint</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Env</th>
                <th className="px-4 py-2">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-text-secondary">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-text-primary">
                    {log.method} {log.endpoint}
                  </td>
                  <td className={`px-4 py-2 ${log.status_code >= 400 ? 'text-danger' : 'text-success'}`}>
                    {log.status_code}
                  </td>
                  <td className="px-4 py-2 text-text-secondary">{log.environment}</td>
                  <td className="px-4 py-2 text-text-secondary">{log.response_time_ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
