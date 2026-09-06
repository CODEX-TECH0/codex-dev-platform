import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface StatusComponent {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';
  updated_at: string;
}

interface StatusIncident {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

const STATUS_META: Record<StatusComponent['status'], { label: string; color: string; icon: typeof CheckCircle2 }> = {
  operational: { label: 'Operational', color: 'text-success', icon: CheckCircle2 },
  degraded: { label: 'Degraded performance', color: 'text-warning', icon: AlertTriangle },
  partial_outage: { label: 'Partial outage', color: 'text-warning', icon: AlertTriangle },
  major_outage: { label: 'Major outage', color: 'text-danger', icon: XCircle },
  maintenance: { label: 'Maintenance', color: 'text-accent-secondary', icon: Wrench }
};

export default function StatusPage() {
  const [components, setComponents] = useState<StatusComponent[]>([]);
  const [incidents, setIncidents] = useState<StatusIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: i }] = await Promise.all([
        supabase.from('status_components').select('*').order('name'),
        supabase.from('status_incidents').select('*').order('created_at', { ascending: false }).limit(10)
      ]);
      setComponents((c ?? []) as unknown as StatusComponent[]);
      setIncidents((i ?? []) as unknown as StatusIncident[]);
      setLoading(false);
    })();
  }, []);

  const allOperational = components.every((c) => c.status === 'operational');

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">System Status</h1>
      {!loading && (
        <p className={`mb-6 text-sm ${allOperational ? 'text-success' : 'text-warning'}`}>
          {allOperational ? 'All systems operational' : 'Some systems are experiencing issues'}
        </p>
      )}

      {loading ? (
        <p className="text-text-secondary">Loading…</p>
      ) : (
        <>
          <div className="divide-y divide-border rounded-lg border border-border bg-surface">
            {components.map((c) => {
              const meta = STATUS_META[c.status];
              const Icon = meta.icon;
              return (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-text-primary">{c.name}</span>
                  <span className={`flex items-center gap-1.5 text-sm ${meta.color}`}>
                    <Icon size={14} /> {meta.label}
                  </span>
                </div>
              );
            })}
          </div>

          <h2 className="mb-3 mt-8 text-sm font-medium text-text-secondary">Recent incidents</h2>
          {incidents.length === 0 ? (
            <p className="text-sm text-text-secondary">No incidents reported.</p>
          ) : (
            <div className="space-y-3">
              {incidents.map((i) => (
                <div key={i.id} className="rounded-lg border border-border bg-surface p-4">
                  <p className="font-medium text-text-primary">{i.title}</p>
                  {i.description && <p className="mt-1 text-sm text-text-secondary">{i.description}</p>}
                  <p className="mt-1 text-xs text-text-secondary">
                    {i.status} · {new Date(i.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
