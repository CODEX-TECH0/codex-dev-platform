// supabase/functions/validate-ip/index.ts
// POST /v1/validate/ip — body: { input: string }
import { defineEndpoint } from '../_shared/handler.ts';

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_RE = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;

function isValidIpv4(input: string): boolean {
  const m = input.match(IPV4_RE);
  if (!m) return false;
  return m.slice(1).every((octet) => Number(octet) >= 0 && Number(octet) <= 255 && String(Number(octet)) === octet.replace(/^0+(?=\d)/, ''));
}

const handler = defineEndpoint<{ input: string }, { valid: boolean; version: 4 | 6 | null }>(
  '/v1/validate/ip',
  'validate',
  (body) => {
    const b = body as { input?: unknown };
    if (typeof b.input !== 'string' || b.input.length === 0) return { error: 'input must be a non-empty string.' };
    return { value: { input: b.input } };
  },
  ({ input }) => {
    if (isValidIpv4(input)) return { valid: true, version: 4 };
    if (IPV6_RE.test(input) && input.includes(':')) return { valid: true, version: 6 };
    return { valid: false, version: null };
  }
);

Deno.serve(handler);
