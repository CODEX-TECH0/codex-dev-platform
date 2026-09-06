// supabase/functions/url-encode/index.ts
// POST /v1/url/encode — body: { input: string }
import { defineEndpoint } from '../_shared/handler.ts';

const handler = defineEndpoint<{ input: string }, { encoded: string }>(
  '/v1/url/encode',
  'url',
  (body) => {
    const b = body as { input?: unknown };
    if (typeof b.input !== 'string' || b.input.length === 0) return { error: 'input must be a non-empty string.' };
    return { value: { input: b.input } };
  },
  ({ input }) => ({ encoded: encodeURIComponent(input) })
);

Deno.serve(handler);
