import { useMemo, useState } from 'react';
import { ToolShell, CopyButton } from '@/components/ToolShell';
import { convertTimestamp } from '@/utils/timestamp';

export default function TimestampToolPage() {
  const [unixInput, setUnixInput] = useState(String(Math.floor(Date.now() / 1000)));
  const [isoInput, setIsoInput] = useState(new Date().toISOString());

  const fromUnix = useMemo(() => {
    // Accept both seconds and milliseconds inputs based on digit count.
    const from = unixInput.length > 10 ? 'unix_ms' : 'unix_seconds';
    const result = convertTimestamp(unixInput, from);
    return { error: result.ok ? null : (result.error ?? 'Invalid input'), iso: result.iso8601 ?? '' };
  }, [unixInput]);

  const fromIso = useMemo(() => {
    const result = convertTimestamp(isoInput, 'iso8601');
    return {
      error: result.ok ? null : (result.error ?? 'Invalid input'),
      seconds: result.ok ? String(result.unixSeconds) : '',
      ms: result.ok ? String(result.unixMs) : ''
    };
  }, [isoInput]);

  return (
    <ToolShell title="Unix Timestamp Converter" description="Convert between Unix time and ISO 8601 / local date-time.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <label className="mb-1 block text-xs text-text-secondary">Unix timestamp (seconds or ms)</label>
          <input
            value={unixInput}
            onChange={(e) => setUnixInput(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-text-primary"
          />
          {fromUnix.error ? (
            <p className="mt-2 text-xs text-danger">{fromUnix.error}</p>
          ) : (
            <div className="mt-3 space-y-1 text-sm">
              <p className="flex items-center justify-between text-text-secondary">
                ISO 8601: <span className="font-mono text-text-primary">{fromUnix.iso}</span>
                <CopyButton text={fromUnix.iso} />
              </p>
              <p className="text-text-secondary">
                Local:{' '}
                <span className="font-mono text-text-primary">{new Date(fromUnix.iso).toLocaleString()}</span>
              </p>
            </div>
          )}
          <button
            onClick={() => setUnixInput(String(Math.floor(Date.now() / 1000)))}
            className="mt-3 text-xs text-accent-secondary hover:underline"
          >
            Use current time
          </button>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <label className="mb-1 block text-xs text-text-secondary">ISO 8601 / date string</label>
          <input
            value={isoInput}
            onChange={(e) => setIsoInput(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-text-primary"
          />
          {fromIso.error ? (
            <p className="mt-2 text-xs text-danger">{fromIso.error}</p>
          ) : (
            <div className="mt-3 space-y-1 text-sm">
              <p className="flex items-center justify-between text-text-secondary">
                Seconds: <span className="font-mono text-text-primary">{fromIso.seconds}</span>
                <CopyButton text={fromIso.seconds} />
              </p>
              <p className="flex items-center justify-between text-text-secondary">
                Milliseconds: <span className="font-mono text-text-primary">{fromIso.ms}</span>
                <CopyButton text={fromIso.ms} />
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
