import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  entry_type: 'feature' | 'improvement' | 'fix' | 'breaking';
  published_at: string;
}

const BADGE_COLOR: Record<ChangelogEntry['entry_type'], string> = {
  feature: 'bg-accent-primary/10 text-accent-primary',
  improvement: 'bg-accent-secondary/10 text-accent-secondary',
  fix: 'bg-success/10 text-success',
  breaking: 'bg-danger/10 text-danger'
};

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('changelog_entries')
        .select('*')
        .order('published_at', { ascending: false });
      setEntries((data ?? []) as unknown as ChangelogEntry[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Changelog</h1>
      <p className="mb-6 text-sm text-text-secondary">What's new in Codex</p>

      {loading ? (
        <p className="text-text-secondary">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-text-secondary">No changelog entries yet.</p>
      ) : (
        <div className="space-y-4">
          {entries.map((e) => (
            <div key={e.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-1 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${BADGE_COLOR[e.entry_type]}`}>
                  {e.entry_type}
                </span>
                <span className="text-xs text-text-secondary">v{e.version}</span>
                <span className="text-xs text-text-secondary">
                  {new Date(e.published_at).toLocaleDateString()}
                </span>
              </div>
              <h2 className="font-medium text-text-primary">{e.title}</h2>
              <p className="mt-1 text-sm text-text-secondary">{e.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
