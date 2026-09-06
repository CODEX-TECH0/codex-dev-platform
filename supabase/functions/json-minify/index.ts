// supabase/functions/json-minify/index.ts
// POST /v1/json/minify — body: { input: string }
import { defineEndpoint } from '../_shared/handler.ts';

const handler = defineEndpoint<{ input: string }, { minified: string }>(
  '/v1/json/minify',
  'json',
  (body) => {
    const b = body as { input?: unknown };
    if (typeof b.input !== 'string' || b.input.length === 0) return { error: 'input must be a non-empty string.' };
    return { value: { input: b.input } };
  },
  ({ input }) => ({ minified: JSON.stringify(JSON.parse(input)) })
);

Deno.serve(handler);
