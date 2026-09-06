// supabase/functions/hash/index.ts
// POST /v1/hash
// Body: { input: string, algorithm?: "SHA-256" | "SHA-384" | "SHA-512" }
// Note: hashing is one-way and is NOT encryption — this endpoint never
// claims or supports reversible output.

import { handleCorsPreflight } from '../_shared/cors.ts';
import { authenticateRequest, hasScope } from '../_shared/authenticate.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { logRequest } from '../_shared/logRequest.ts';
import { ok, fail, requestId } from '../_shared/response.ts';

const MAX_INPUT_LENGTH = 100_000;
const ALGORITHMS = ['SHA-256', 'SHA-384', 'SHA-512'] as const;
type Algorithm = (typeof ALGORITHMS)[number];

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const reqId = requestId();
  const startedAt = Date.now();
  const endpoint = '/v1/hash';

  const auth = await authenticateRequest(req);
  if (!auth.ok) return fail(auth.code, auth.message, reqId);
  const { context } = auth;

  if (!hasScope(context, 'hash')) {
    return fail('PERMISSION_DENIED', 'This API key does not have the "hash" scope.', reqId);
  }

  const rate = await checkRateLimit(context);
  if (!rate.allowed) {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 429, startedAt, errorCode: 'RATE_LIMITED' });
    return fail('RATE_LIMITED', 'Too many requests. Please slow down.', reqId);
  }

  let body: { input?: string; algorithm?: string };
  try {
    body = JSON.parse(await req.text());
  } catch {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', 'Request body must be valid JSON.', reqId);
  }

  const algorithm = (body.algorithm ?? 'SHA-256') as Algorithm;
  if (!ALGORITHMS.includes(algorithm)) {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', `algorithm must be one of ${ALGORITHMS.join(', ')}.`, reqId);
  }

  if (typeof body.input !== 'string' || body.input.length === 0 || body.input.length > MAX_INPUT_LENGTH) {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', `input must be a non-empty string up to ${MAX_INPUT_LENGTH} characters.`, reqId);
  }

  const digestBuffer = await crypto.subtle.digest(algorithm, new TextEncoder().encode(body.input));
  const hex = [...new Uint8Array(digestBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

  await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 200, startedAt });
  return ok({ algorithm, hash: hex, note: 'Hashing is one-way and is not a form of encryption.' }, reqId);
});
