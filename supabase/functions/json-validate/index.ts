// supabase/functions/json-validate/index.ts
// POST /v1/json/validate — body: { input: string }
import { defineEndpoint } from '../_shared/handler.ts';

const handler = defineEndpoint<{ input: string }, { valid: boolean; error: string | null }>(
  '/v1/json/validate',
  'json',
  (body) => {
    const b = body as { input?: unknown };
    if (typeof b.input !== 'string' || b.input.length === 0) return { error: 'input must be a non-empty string.' };
    return { value: { input: b.input } };
  },
  ({ input }) => {
    try {
      JSON.parse(input);
      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
    }
  }
);

Deno.serve(handler);
