import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_type: string;
  action: string;
  resource_type: string;
  result: string;
  created_at: string;
}

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('id, actor_id, actor_type, action, resource_type, result, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      setRows((data ?? []) as unknown as AuditRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Audit Log</h1>
      <p className="mb-6 text-sm text-text-secondary">Who did what, when, and the result</p>

      {loading ? (
        <p className="text-text-secondary">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-text-secondary">No audit events recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-text-secondary">
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Actor</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Resource</th>
                <th className="px-4 py-2">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-text-secondary">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-text-secondary">{r.actor_id ?? r.actor_type}</td>
                  <td className="px-4 py-2 text-text-primary">{r.action}</td>
                  <td className="px-4 py-2 text-text-secondary">{r.resource_type}</td>
                  <td className={`px-4 py-2 ${r.result === 'success' ? 'text-success' : 'text-danger'}`}>
                    {r.result}
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
