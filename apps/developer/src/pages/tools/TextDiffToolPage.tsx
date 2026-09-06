import { useMemo, useState } from 'react';
import { ToolShell, TextArea } from '@/components/ToolShell';
import { diffLines } from '@/utils/diffLines';

export default function TextDiffToolPage() {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');

  const diff = useMemo(() => diffLines(left, right), [left, right]);
  const added = diff.filter((d) => d.type === 'added').length;
  const removed = diff.filter((d) => d.type === 'removed').length;

  return (
    <ToolShell title="Text Diff" description="Compare two blocks of text line by line.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Original</label>
          <TextArea value={left} onChange={setLeft} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Changed</label>
          <TextArea value={right} onChange={setRight} />
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1 text-xs text-text-secondary">
          <span className="text-success">+{added}</span> <span className="text-danger">-{removed}</span>
        </p>
        <div className="max-h-96 overflow-y-auto rounded-md border border-border bg-bg font-mono text-sm">
          {diff.map((line, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap px-3 py-0.5 ${
                line.type === 'added'
                  ? 'bg-success/10 text-success'
                  : line.type === 'removed'
                    ? 'bg-danger/10 text-danger'
                    : 'text-text-secondary'
              }`}
            >
              {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </ToolShell>
  );
}
