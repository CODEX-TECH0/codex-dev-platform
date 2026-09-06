import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/features/auth/AdminAuthContext';

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  entry_type: 'feature' | 'improvement' | 'fix' | 'breaking';
  published_at: string;
}

const TYPES = ['feature', 'improvement', 'fix', 'breaking'] as const;

export default function AdminChangelogPage() {
  const { user } = useAdminAuth();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [entryType, setEntryType] = useState<(typeof TYPES)[number]>('feature');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase.from('changelog_entries').select('*').order('published_at', { ascending: false });
    setEntries((data ?? []) as unknown as ChangelogEntry[]);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !version.trim() || !title.trim() || !description.trim()) return;
    setSubmitting(true);
    setError(null);

    const { error } = await supabase.from('changelog_entries').insert({
      version: version.trim(),
      title: title.trim(),
      description: description.trim(),
      entry_type: entryType,
      created_by: user.id
    });

    if (error) setError(error.message);
    else {
      setVersion('');
      setTitle('');
      setDescription('');
      await refresh();
    }
    setSubmitting(false);
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Changelog</h1>
      <p className="mb-6 text-sm text-text-secondary">Publish entries that appear on the public /changelog page</p>

      <form onSubmit={handleSubmit} className="mb-8 max-w-xl space-y-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex gap-3">
          <input
            required
            placeholder="Version (e.g. 1.2.0)"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-40 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
          />
          <select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value as typeof entryType)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <input
          required
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
        />
        <textarea
          required
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-24 w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Publishing…' : 'Publish entry'}
        </button>
      </form>

      <div className="space-y-3">
        {entries.map((e) => (
          <div key={e.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-text-secondary">
              <span className="capitalize text-accent-primary">{e.entry_type}</span>
              <span>· v{e.version}</span>
              <span>· {new Date(e.published_at).toLocaleDateString()}</span>
            </div>
            <p className="font-medium text-text-primary">{e.title}</p>
            <p className="mt-1 text-sm text-text-secondary">{e.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
