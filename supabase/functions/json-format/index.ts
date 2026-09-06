// supabase/functions/json-format/index.ts
// POST /v1/json/format — body: { input: string, indent?: number (0-8, default 2) }
import { defineEndpoint } from '../_shared/handler.ts';

const handler = defineEndpoint<{ input: string; indent: number }, { formatted: string }>(
  '/v1/json/format',
  'json',
  (body) => {
    const b = body as { input?: unknown; indent?: unknown };
    if (typeof b.input !== 'string' || b.input.length === 0) return { error: 'input must be a non-empty string.' };
    const indent = typeof b.indent === 'number' ? b.indent : 2;
    if (!Number.isInteger(indent) || indent < 0 || indent > 8) return { error: 'indent must be an integer between 0 and 8.' };
    return { value: { input: b.input, indent } };
  },
  ({ input, indent }) => ({ formatted: JSON.stringify(JSON.parse(input), null, indent) })
);

Deno.serve(handler);
