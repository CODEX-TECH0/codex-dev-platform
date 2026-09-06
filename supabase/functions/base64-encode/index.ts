// supabase/functions/base64-encode/index.ts
// POST /v1/base64/encode
// Body: { input: string }
// UTF-8 safe: encodes the UTF-8 byte representation of the input string.

import { handleCorsPreflight } from '../_shared/cors.ts';
import { authenticateRequest, hasScope } from '../_shared/authenticate.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { logRequest } from '../_shared/logRequest.ts';
import { ok, fail, requestId } from '../_shared/response.ts';

const MAX_INPUT_LENGTH = 500_000;

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const reqId = requestId();
  const startedAt = Date.now();
  const endpoint = '/v1/base64/encode';

  const auth = await authenticateRequest(req);
  if (!auth.ok) return fail(auth.code, auth.message, reqId);
  const { context } = auth;

  if (!hasScope(context, 'base64')) {
    return fail('PERMISSION_DENIED', 'This API key does not have the "base64" scope.', reqId);
  }

  const rate = await checkRateLimit(context);
  if (!rate.allowed) {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 429, startedAt, errorCode: 'RATE_LIMITED' });
    return fail('RATE_LIMITED', 'Too many requests. Please slow down.', reqId);
  }

  let body: { input?: string };
  try {
    body = JSON.parse(await req.text());
  } catch {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', 'Request body must be valid JSON.', reqId);
  }

  if (typeof body.input !== 'string' || body.input.length === 0 || body.input.length > MAX_INPUT_LENGTH) {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', `input must be a non-empty string up to ${MAX_INPUT_LENGTH} characters.`, reqId);
  }

  const bytes = new TextEncoder().encode(body.input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary);

  await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 200, startedAt });
  return ok({ encoded }, reqId);
});
