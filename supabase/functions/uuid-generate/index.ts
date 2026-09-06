// supabase/functions/uuid-generate/index.ts
// POST /v1/uuid/generate
// Body: { version?: 4, count?: number (1-100, default 1) }

import { handleCorsPreflight } from '../_shared/cors.ts';
import { authenticateRequest, hasScope } from '../_shared/authenticate.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { logRequest } from '../_shared/logRequest.ts';
import { ok, fail, requestId } from '../_shared/response.ts';

const MAX_COUNT = 100;
const MAX_BODY_BYTES = 10_000;

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const reqId = requestId();
  const startedAt = Date.now();
  const endpoint = '/v1/uuid/generate';

  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    return fail(auth.code, auth.message, reqId);
  }
  const { context } = auth;

  if (!hasScope(context, 'uuid')) {
    return fail('PERMISSION_DENIED', 'This API key does not have the "uuid" scope.', reqId);
  }

  const rate = await checkRateLimit(context);
  if (!rate.allowed) {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 429, startedAt, errorCode: 'RATE_LIMITED' });
    return fail('RATE_LIMITED', 'Too many requests. Please slow down.', reqId);
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 413, startedAt, errorCode: 'REQUEST_TOO_LARGE' });
    return fail('REQUEST_TOO_LARGE', 'Request body exceeds the allowed size.', reqId);
  }

  let body: { version?: number; count?: number } = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', 'Request body must be valid JSON.', reqId);
  }

  const count = body.count ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', `count must be an integer between 1 and ${MAX_COUNT}.`, reqId);
  }

  const uuids = Array.from({ length: count }, () => crypto.randomUUID());

  await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 200, startedAt });
  return ok({ uuids, count: uuids.length, version: 4 }, reqId);
});
