// supabase/functions/validate-email/index.ts
// POST /v1/validate/email — body: { input: string }
// Format/structure validation only — does not verify the mailbox exists.
import { defineEndpoint } from '../_shared/handler.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const handler = defineEndpoint<{ input: string }, { valid: boolean; note: string }>(
  '/v1/validate/email',
  'validate',
  (body) => {
    const b = body as { input?: unknown };
    if (typeof b.input !== 'string' || b.input.length === 0) return { error: 'input must be a non-empty string.' };
    return { value: { input: b.input } };
  },
  ({ input }) => ({
    valid: EMAIL_RE.test(input),
    note: 'Validates format only — does not verify the mailbox exists or accepts mail.'
  })
);

Deno.serve(handler);
