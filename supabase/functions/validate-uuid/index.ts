// supabase/functions/validate-uuid/index.ts
// POST /v1/validate/uuid — body: { input: string }
import { defineEndpoint } from '../_shared/handler.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const handler = defineEndpoint<{ input: string }, { valid: boolean; version: number | null }>(
  '/v1/validate/uuid',
  'validate',
  (body) => {
    const b = body as { input?: unknown };
    if (typeof b.input !== 'string' || b.input.length === 0) return { error: 'input must be a non-empty string.' };
    return { value: { input: b.input } };
  },
  ({ input }) => {
    const valid = UUID_RE.test(input);
    return { valid, version: valid ? Number(input[14]) : null };
  }
);

Deno.serve(handler);
