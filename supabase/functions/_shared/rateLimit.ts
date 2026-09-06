// _shared/rateLimit.ts
// Simple fixed-window rate limit keyed by API key, backed by request_logs.
// Good enough for V1 beta traffic; swap for a Redis/Upstash-backed limiter
// before scaling beyond a handful of requests/sec per key.

import type { AuthContext } from './authenticate.ts';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 120; // per API key, per minute

export async function checkRateLimit(context: AuthContext): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

  const { count, error } = await context.admin
    .from('request_logs')
    .select('id', { count: 'exact', head: true })
    .eq('api_key_id', context.apiKeyId)
    .gte('created_at', windowStart);

  if (error) {
    // Fail open on infra errors rather than blocking all traffic, but log it.
    // eslint-disable-next-line no-console
    console.error('rate limit check failed', error);
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW };
  }

  const used = count ?? 0;
  return { allowed: used < MAX_REQUESTS_PER_WINDOW, remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - used) };
}
