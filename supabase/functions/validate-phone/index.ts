// supabase/functions/validate-phone/index.ts
// POST /v1/validate/phone — body: { input: string }
// Structural E.164-style validation only (+ up to 15 digits) — does not
// verify the number is assigned, reachable, or carrier-valid.
import { defineEndpoint } from '../_shared/handler.ts';

const E164_RE = /^\+[1-9]\d{6,14}$/;

const handler = defineEndpoint<{ input: string }, { valid: boolean; note: string }>(
  '/v1/validate/phone',
  'validate',
  (body) => {
    const b = body as { input?: unknown };
    if (typeof b.input !== 'string' || b.input.length === 0) return { error: 'input must be a non-empty string.' };
    return { value: { input: b.input } };
  },
  ({ input }) => ({
    valid: E164_RE.test(input.trim()),
    note: 'Validates E.164 format (e.g. +14155552671) only — does not verify the number is reachable.'
  })
);

Deno.serve(handler);
