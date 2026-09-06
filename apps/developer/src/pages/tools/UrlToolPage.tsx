import { useMemo, useState } from 'react';
import { ToolShell, CopyButton, ClearButton, TextArea } from '@/components/ToolShell';

export default function UrlToolPage() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('');

  const result = useMemo(() => {
    if (!input) return { output: '', error: null as string | null };
    try {
      return { output: mode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input), error: null };
    } catch {
      return { output: '', error: 'Invalid percent-encoding in input.' };
    }
  }, [input, mode]);

  const parsed = useMemo(() => {
    try {
      const url = new URL(input);
      return {
        protocol: url.protocol,
        host: url.host,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
        params: [...url.searchParams.entries()]
      };
    } catch {
      return null;
    }
  }, [input]);

  return (
    <ToolShell title="URL Encoder / Decoder" description="Percent-encode/decode strings, or parse a full URL.">
      <div className="mb-4 flex gap-2">
        {(['encode', 'decode'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1.5 text-sm capitalize ${
              mode === m ? 'bg-accent-primary text-white' : 'bg-surface text-text-secondary border border-border'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs text-text-secondary">Input</label>
            <ClearButton onClear={() => setInput('')} />
          </div>
          <TextArea value={input} onChange={setInput} error={!!result.error} />
          {result.error && <p className="mt-1 text-xs text-danger">{result.error}</p>}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs text-text-secondary">Output</label>
            <CopyButton text={result.output} />
          </div>
          <TextArea value={result.output} readOnly />
        </div>
      </div>

      {parsed && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm">
          <p className="mb-2 text-xs text-text-secondary">Parsed as URL</p>
          <div className="grid grid-cols-2 gap-2 text-text-secondary">
            <span>Protocol: <span className="text-text-primary">{parsed.protocol}</span></span>
            <span>Host: <span className="text-text-primary">{parsed.host}</span></span>
            <span>Path: <span className="text-text-primary">{parsed.pathname}</span></span>
            <span>Hash: <span className="text-text-primary">{parsed.hash || '—'}</span></span>
          </div>
          {parsed.params.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs text-text-secondary">Query params</p>
              <ul className="space-y-0.5 font-mono text-xs text-text-primary">
                {parsed.params.map(([k, v], i) => (
                  <li key={i}>
                    {k} = {v}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  );
}
