import { useMemo, useState } from 'react';
import { ToolShell, CopyButton, ClearButton, TextArea } from '@/components/ToolShell';

export default function Base64ToolPage() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('');

  const result = useMemo(() => {
    if (!input) return { output: '', error: null as string | null };
    try {
      if (mode === 'encode') {
        const bytes = new TextEncoder().encode(input);
        let binary = '';
        bytes.forEach((b) => (binary += String.fromCharCode(b)));
        return { output: btoa(binary), error: null };
      }
      const binary = atob(input);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return { output: new TextDecoder('utf-8', { fatal: true }).decode(bytes), error: null };
    } catch {
      return { output: '', error: mode === 'encode' ? 'Unable to encode input.' : 'Invalid Base64 input.' };
    }
  }, [input, mode]);

  return (
    <ToolShell title="Base64 Encoder / Decoder" description="UTF-8 safe Base64 encoding and decoding.">
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
            <label className="text-xs text-text-secondary">{mode === 'encode' ? 'Plain text' : 'Base64'}</label>
            <ClearButton onClear={() => setInput('')} />
          </div>
          <TextArea value={input} onChange={setInput} error={!!result.error} />
          {result.error && <p className="mt-1 text-xs text-danger">{result.error}</p>}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs text-text-secondary">{mode === 'encode' ? 'Base64' : 'Plain text'}</label>
            <CopyButton text={result.output} />
          </div>
          <TextArea value={result.output} readOnly />
        </div>
      </div>
    </ToolShell>
  );
}
