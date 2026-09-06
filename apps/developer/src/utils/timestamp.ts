export type TimestampFrom = 'unix_seconds' | 'unix_ms' | 'iso8601';

export interface TimestampConversionResult {
  ok: boolean;
  error?: string;
  unixSeconds?: number;
  unixMs?: number;
  iso8601?: string;
}

/** Pure conversion logic shared conceptually with the /v1/timestamp/convert Edge Function. */
export function convertTimestamp(value: string | number, from: TimestampFrom): TimestampConversionResult {
  let ms: number;
  if (from === 'unix_seconds') ms = Number(value) * 1000;
  else if (from === 'unix_ms') ms = Number(value);
  else ms = new Date(value).getTime();

  if (!Number.isFinite(ms) || Number.isNaN(ms)) {
    return { ok: false, error: 'Unable to parse the given value with the specified format.' };
  }

  return {
    ok: true,
    unixSeconds: Math.floor(ms / 1000),
    unixMs: Math.floor(ms),
    iso8601: new Date(ms).toISOString()
  };
}
