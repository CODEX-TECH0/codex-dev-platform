// supabase/functions/url-decode/index.ts
// POST /v1/url/decode — body: { input: string }
import { defineEndpoint } from '../_shared/handler.ts';

const handler = defineEndpoint<{ input: string }, { decoded: string }>(
  '/v1/url/decode',
  'url',
  (body) => {
    const b = body as { input?: unknown };
    if (typeof b.input !== 'string' || b.input.length === 0) return { error: 'input must be a non-empty string.' };
    return { value: { input: b.input } };
  },
  ({ input }) => {
    try {
      return { decoded: decodeURIComponent(input) };
    } catch {
      throw new Error('Invalid percent-encoding in input.');
    }
  }
);

Deno.serve(handler);
