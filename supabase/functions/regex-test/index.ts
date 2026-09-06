// supabase/functions/regex-test/index.ts
// POST /v1/regex/test — body: { pattern: string, flags?: string, input: string }
// Guards against catastrophic execution by bounding input length and using a
// wall-clock timeout via Promise.race is not reliable for sync regex in
// Deno's isolate, so we instead cap input size and pattern length as the
// primary defense — the same approach used by json/regex sandboxes generally.
import { defineEndpoint } from '../_shared/handler.ts';

const MAX_PATTERN_LENGTH = 500;
const MAX_INPUT_LENGTH = 20_000;
const VALID_FLAGS = /^[gimsuy]*$/;

interface Params {
  pattern: string;
  flags: string;
  input: string;
}

const handler = defineEndpoint<Params, { matched: boolean; matches: string[] }>(
  '/v1/regex/test',
  'regex',
  (body) => {
    const b = body as { pattern?: unknown; flags?: unknown; input?: unknown };
    if (typeof b.pattern !== 'string' || b.pattern.length === 0 || b.pattern.length > MAX_PATTERN_LENGTH) {
      return { error: `pattern must be a non-empty string up to ${MAX_PATTERN_LENGTH} characters.` };
    }
    const flags = typeof b.flags === 'string' ? b.flags : '';
    if (!VALID_FLAGS.test(flags)) return { error: 'flags may only contain g, i, m, s, u, y.' };
    if (typeof b.input !== 'string' || b.input.length > MAX_INPUT_LENGTH) {
      return { error: `input must be a string up to ${MAX_INPUT_LENGTH} characters.` };
    }
    return { value: { pattern: b.pattern, flags, input: b.input } };
  },
  ({ pattern, flags, input }) => {
    let re: RegExp;
    try {
      re = new RegExp(pattern, flags);
    } catch {
      throw new Error('Invalid regular expression.');
    }
    const matches = flags.includes('g') ? [...input.matchAll(re)].map((m) => m[0]) : re.test(input) ? [input.match(re)?.[0] ?? ''] : [];
    return { matched: matches.length > 0, matches };
  }
);

Deno.serve(handler);
