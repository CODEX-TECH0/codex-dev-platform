import { useMemo, useState } from 'react';
import { ToolShell, CopyButton, ClearButton, TextArea } from '@/components/ToolShell';

export default function JsonToolPage() {
  const [input, setInput] = useState('');

  const result = useMemo(() => {
    if (!input.trim()) return { output: '', error: null as string | null, valid: false };
    try {
      const parsed = JSON.parse(input);
      return { output: JSON.stringify(parsed, null, 2), error: null, valid: true };
    } catch (e) {
      return { output: '', error: e instanceof Error ? e.message : 'Invalid JSON', valid: false };
    }
  }, [input]);

  const minified = useMemo(() => {
    if (!result.valid) return '';
    try {
      return JSON.stringify(JSON.parse(input));
    } catch {
      return '';
    }
  }, [input, result.valid]);

  return (
    <ToolShell title="JSON Formatter / Validator / Minifier" description="Paste JSON to validate, pretty-print, or minify it.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs text-text-secondary">Input</label>
            <ClearButton onClear={() => setInput('')} />
          </div>
          <TextArea value={input} onChange={setInput} placeholder='{"hello": "world"}' error={!!result.error} />
          {result.error && <p className="mt-1 text-xs text-danger">{result.error}</p>}
          {result.valid && <p className="mt-1 text-xs text-success">Valid JSON</p>}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs text-text-secondary">Formatted output</label>
            <CopyButton text={result.output} />
          </div>
          <TextArea value={result.output} readOnly placeholder="Formatted JSON will appear here" />
        </div>
      </div>

      {result.valid && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs text-text-secondary">Minified</label>
            <CopyButton text={minified} />
          </div>
          <TextArea value={minified} readOnly />
        </div>
      )}
    </ToolShell>
  );
}
