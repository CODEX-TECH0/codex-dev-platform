import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/features/auth/AdminAuthContext';

interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'important' | 'critical';
  audience: string;
  channels: string[];
  created_at: string;
}

const AUDIENCES = ['everyone', 'free', 'developers', 'pro', 'enterprise'] as const;
const SEVERITIES = ['info', 'important', 'critical'] as const;

export default function AdminAnnouncementsPage() {
  const { user } = useAdminAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>('info');
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>('everyone');
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setAnnouncements((data ?? []) as unknown as Announcement[]);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !title.trim() || !body.trim()) return;
    setSubmitting(true);
    setError(null);

    const channels = [...(inApp ? ['in_app'] : []), ...(email ? ['email'] : [])];

    const { data: created, error: insertError } = await supabase
      .from('announcements')
      .insert({
        title: title.trim(),
        body: body.trim(),
        severity,
        audience,
        channels,
        created_by: user.id,
        published_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError || !created) {
      setError(insertError?.message ?? 'Failed to publish announcement.');
      setSubmitting(false);
      return;
    }

    if (inApp || email) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const res = await fetch(`${supabaseUrl}/functions/v1/send-announcement-email`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcement_id: created.id })
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(`Announcement published, but delivery failed: ${json?.error?.message ?? 'unknown error'}`);
        } else {
          // The function reports in-app and email failures independently
          // (a failure in one never overwrites a real success in the
          // other) rather than as an all-or-nothing HTTP error — so a
          // partial failure still comes back as success: true and has to
          // be checked explicitly here, not inferred from res.ok alone.
          const d = json.data as {
            notifications_error?: string | null;
            email_error?: string | null;
            notifications_created: number;
            emails_sent: number;
          };
          const problems: string[] = [];
          if (d.notifications_error) problems.push(`in-app notifications failed: ${d.notifications_error}`);
          if (d.email_error) problems.push(`email failed: ${d.email_error}`);
          if (problems.length > 0) {
            setError(`Announcement published, but ${problems.join('; ')}.`);
          }
        }
      } catch (e) {
        setError(`Announcement published, but delivery failed: ${e instanceof Error ? e.message : 'unknown error'}`);
      }
    }

    setTitle('');
    setBody('');
    await refresh();
    setSubmitting(false);
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Announcements</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Publishing fans out immediately: "In-app" creates a notification row for every matching user (this is
        what populates their Notifications page), "Email" sends via Resend to the same audience.
      </p>

      <form onSubmit={handleSubmit} className="mb-8 max-w-xl space-y-3 rounded-lg border border-border bg-surface p-4">
        <input
          required
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
        />
        <textarea
          required
          placeholder="Message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="h-24 w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
        />
        <div className="flex flex-wrap gap-3">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as typeof severity)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as typeof audience)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
          >
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            <input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} /> In-app
          </label>
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email
          </label>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Publishing…' : 'Publish announcement'}
        </button>
      </form>

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-text-secondary">
              <span
                className={
                  a.severity === 'critical' ? 'text-danger' : a.severity === 'important' ? 'text-warning' : 'text-accent-secondary'
                }
              >
                {a.severity}
              </span>
              <span>· {a.audience}</span>
              <span>· {new Date(a.created_at).toLocaleString()}</span>
            </div>
            <p className="font-medium text-text-primary">{a.title}</p>
            <p className="mt-1 text-sm text-text-secondary">{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
