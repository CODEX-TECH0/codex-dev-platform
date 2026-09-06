// supabase/functions/validate-url/index.ts
// POST /v1/validate/url — body: { input: string }
import { defineEndpoint } from '../_shared/handler.ts';

const handler = defineEndpoint<{ input: string }, { valid: boolean }>(
  '/v1/validate/url',
  'validate',
  (body) => {
    const b = body as { input?: unknown };
    if (typeof b.input !== 'string' || b.input.length === 0) return { error: 'input must be a non-empty string.' };
    return { value: { input: b.input } };
  },
  ({ input }) => {
    try {
      new URL(input);
      return { valid: true };
    } catch {
      return { valid: false };
    }
  }
);

Deno.serve(handler);
