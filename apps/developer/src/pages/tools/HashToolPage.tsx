import { useEffect, useState } from 'react';
import { ToolShell, CopyButton, ClearButton, TextArea } from '@/components/ToolShell';

const ALGORITHMS = ['SHA-256', 'SHA-384', 'SHA-512'] as const;

export default function HashToolPage() {
  const [input, setInput] = useState('');
  const [algorithm, setAlgorithm] = useState<(typeof ALGORITHMS)[number]>('SHA-256');
  const [hash, setHash] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!input) {
      setHash('');
      return;
    }
    crypto.subtle.digest(algorithm, new TextEncoder().encode(input)).then((buf) => {
      if (cancelled) return;
      const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
      setHash(hex);
    });
    return () => {
      cancelled = true;
    };
  }, [input, algorithm]);

  return (
    <ToolShell title="Hash Generator" description="Hashing is one-way and is not a form of encryption.">
      <div className="mb-4 flex gap-2">
        {ALGORITHMS.map((a) => (
          <button
            key={a}
            onClick={() => setAlgorithm(a)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              algorithm === a ? 'bg-accent-primary text-white' : 'bg-surface text-text-secondary border border-border'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs text-text-secondary">Input</label>
        <ClearButton onClear={() => setInput('')} />
      </div>
      <TextArea value={input} onChange={setInput} />

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs text-text-secondary">{algorithm} hash</label>
          <CopyButton text={hash} />
        </div>
        <input
          readOnly
          value={hash}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-text-primary"
        />
      </div>
    </ToolShell>
  );
}
