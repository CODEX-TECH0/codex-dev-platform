import { describe, it, expect } from 'vitest';

// Minimal smoke test so `npm run test` has something real to run in CI.
// This is not meaningful coverage — see README "Known limitations" for what
// still needs test coverage (RLS policies, Edge Function auth pipeline,
// OTP attempt-limiting, rate limiting) before this is production-ready.
describe('sanity', () => {
  it('environment runs', () => {
    expect(1 + 1).toBe(2);
  });
});
