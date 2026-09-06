import { useState } from 'react';
import { ToolShell, CopyButton, TextArea } from '@/components/ToolShell';

export default function UuidToolPage() {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>(() => Array.from({ length: 5 }, () => crypto.randomUUID()));

  function generate() {
    const n = Math.min(100, Math.max(1, count));
    setUuids(Array.from({ length: n }, () => crypto.randomUUID()));
  }

  return (
    <ToolShell title="UUID Generator" description="Generate cryptographically random UUID v4 values.">
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-text-secondary">Count</label>
        <input
          type="number"
          min={1}
          max={100}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-24 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
        />
        <button onClick={generate} className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white">
          Generate
        </button>
      </div>

      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs text-text-secondary">Output</label>
        <CopyButton text={uuids.join('\n')} />
      </div>
      <TextArea value={uuids.join('\n')} readOnly />
    </ToolShell>
  );
}
