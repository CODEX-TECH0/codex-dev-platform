// supabase/functions/timestamp-convert/index.ts
// POST /v1/timestamp/convert
// Body: { value: number | string, from: "unix_seconds" | "unix_ms" | "iso8601" }
// Returns the value represented in all supported formats.
import { defineEndpoint } from '../_shared/handler.ts';

type From = 'unix_seconds' | 'unix_ms' | 'iso8601';
const VALID_FROM: From[] = ['unix_seconds', 'unix_ms', 'iso8601'];

interface Result {
  unix_seconds: number;
  unix_ms: number;
  iso8601: string;
}

const handler = defineEndpoint<{ value: number | string; from: From }, Result>(
  '/v1/timestamp/convert',
  'timestamp',
  (body) => {
    const b = body as { value?: unknown; from?: unknown };
    if (typeof b.from !== 'string' || !VALID_FROM.includes(b.from as From)) {
      return { error: `from must be one of ${VALID_FROM.join(', ')}.` };
    }
    if (typeof b.value !== 'number' && typeof b.value !== 'string') {
      return { error: 'value must be a number or string.' };
    }
    return { value: { value: b.value, from: b.from as From } };
  },
  ({ value, from }) => {
    let ms: number;
    if (from === 'unix_seconds') ms = Number(value) * 1000;
    else if (from === 'unix_ms') ms = Number(value);
    else ms = new Date(value).getTime();

    if (!Number.isFinite(ms) || Number.isNaN(ms)) {
      throw new Error('Unable to parse the given value with the specified format.');
    }

    return {
      unix_seconds: Math.floor(ms / 1000),
      unix_ms: Math.floor(ms),
      iso8601: new Date(ms).toISOString()
    };
  }
);

Deno.serve(handler);
