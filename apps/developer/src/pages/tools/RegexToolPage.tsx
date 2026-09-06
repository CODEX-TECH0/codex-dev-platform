import { useMemo, useState } from 'react';
import { ToolShell, TextArea } from '@/components/ToolShell';

export default function RegexToolPage() {
  const [pattern, setPattern] = useState('\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('Contact us at hello@codex.dev or support@codex.dev.');

  const result = useMemo(() => {
    try {
      const re = new RegExp(pattern, flags);
      const matches = [...text.matchAll(new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'))];
      return { error: null as string | null, matches, re };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Invalid regular expression', matches: [], re: null };
    }
  }, [pattern, flags, text]);

  const highlighted = useMemo(() => {
    if (result.error || result.matches.length === 0) return null;
    const parts: { text: string; match: boolean }[] = [];
    let lastIndex = 0;
    for (const m of result.matches) {
      const start = m.index ?? 0;
      if (start > lastIndex) parts.push({ text: text.slice(lastIndex, start), match: false });
      parts.push({ text: m[0], match: true });
      lastIndex = start + m[0].length;
      if (m[0].length === 0) break; // avoid infinite loop on zero-length matches
    }
    if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), match: false });
    return parts;
  }, [result, text]);

  return (
    <ToolShell title="Regex Tester" description="Test a regular expression against sample text.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-text-secondary">/</span>
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="min-w-[280px] flex-1 rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-text-primary"
        />
        <span className="text-text-secondary">/</span>
        <input
          value={flags}
          onChange={(e) => setFlags(e.target.value.replace(/[^gimsuy]/g, ''))}
          className="w-20 rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-text-primary"
        />
      </div>

      {result.error && <p className="mb-3 text-xs text-danger">{result.error}</p>}

      <label className="mb-1 block text-xs text-text-secondary">Test text</label>
      <TextArea value={text} onChange={setText} />

      <div className="mt-4">
        <p className="mb-1 text-xs text-text-secondary">
          {result.matches.length} match{result.matches.length === 1 ? '' : 'es'}
        </p>
        {highlighted && (
          <div className="whitespace-pre-wrap rounded-md border border-border bg-bg p-3 font-mono text-sm">
            {highlighted.map((p, i) =>
              p.match ? (
                <mark key={i} className="rounded bg-accent-primary/30 text-text-primary">
                  {p.text}
                </mark>
              ) : (
                <span key={i} className="text-text-secondary">
                  {p.text}
                </span>
              )
            )}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
