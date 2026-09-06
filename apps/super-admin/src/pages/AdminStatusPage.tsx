import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/features/auth/AdminAuthContext';

interface StatusComponent {
  id: string;
  name: string;
  status: string;
  updated_at: string;
}

interface StatusIncident {
  id: string;
  component_id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

const COMPONENT_STATUSES = ['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance'] as const;
const INCIDENT_STATUSES = ['investigating', 'identified', 'monitoring', 'resolved'] as const;

export default function AdminStatusPage() {
  const { user } = useAdminAuth();
  const [components, setComponents] = useState<StatusComponent[]>([]);
  const [incidents, setIncidents] = useState<StatusIncident[]>([]);
  const [savingComponentId, setSavingComponentId] = useState<string | null>(null);

  const [incidentComponentId, setIncidentComponentId] = useState('');
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentStatus, setIncidentStatus] = useState<(typeof INCIDENT_STATUSES)[number]>('investigating');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [{ data: c }, { data: i }] = await Promise.all([
      supabase.from('status_components').select('*').order('name'),
      supabase.from('status_incidents').select('*').order('created_at', { ascending: false }).limit(20)
    ]);
    setComponents((c ?? []) as unknown as StatusComponent[]);
    setIncidents((i ?? []) as unknown as StatusIncident[]);
    if (c && c.length > 0 && !incidentComponentId) setIncidentComponentId((c[0] as StatusComponent).id);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleComponentStatusChange(id: string, status: string) {
    setSavingComponentId(id);
    await supabase.from('status_components').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    await refresh();
    setSavingComponentId(null);
  }

  async function handleCreateIncident(e: FormEvent) {
    e.preventDefault();
    if (!user || !incidentComponentId || !incidentTitle.trim()) return;
    setSubmitting(true);
    setError(null);

    const { error } = await supabase.from('status_incidents').insert({
      component_id: incidentComponentId,
      title: incidentTitle.trim(),
      description: incidentDescription.trim() || null,
      status: incidentStatus,
      created_by: user.id,
      resolved_at: incidentStatus === 'resolved' ? new Date().toISOString() : null
    });

    if (error) setError(error.message);
    else {
      setIncidentTitle('');
      setIncidentDescription('');
      await refresh();
    }
    setSubmitting(false);
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Status Page</h1>
      <p className="mb-6 text-sm text-text-secondary">Controls the public /status page</p>

      <h2 className="mb-3 text-sm font-medium text-text-secondary">Components</h2>
      <div className="mb-8 divide-y divide-border rounded-lg border border-border bg-surface">
        {components.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-text-primary">{c.name}</span>
            <select
              value={c.status}
              disabled={savingComponentId === c.id}
              onChange={(e) => handleComponentStatusChange(c.id, e.target.value)}
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text-primary disabled:opacity-50"
            >
              {COMPONENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-medium text-text-secondary">Log an incident</h2>
      <form onSubmit={handleCreateIncident} className="mb-8 max-w-xl space-y-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex gap-3">
          <select
            value={incidentComponentId}
            onChange={(e) => setIncidentComponentId(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
          >
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={incidentStatus}
            onChange={(e) => setIncidentStatus(e.target.value as typeof incidentStatus)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
          >
            {INCIDENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <input
          required
          placeholder="Incident title"
          value={incidentTitle}
          onChange={(e) => setIncidentTitle(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
        />
        <textarea
          placeholder="Description (optional)"
          value={incidentDescription}
          onChange={(e) => setIncidentDescription(e.target.value)}
          className="h-20 w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Logging…' : 'Log incident'}
        </button>
      </form>

      <h2 className="mb-3 text-sm font-medium text-text-secondary">Recent incidents</h2>
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
    </div>
  );
}
