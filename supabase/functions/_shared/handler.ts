// _shared/handler.ts
// Wraps the common auth -> rate-limit -> parse-body -> execute -> log flow
// shared by simple synchronous utility endpoints (json/url/timestamp/validate/regex).
// Endpoints with extra requirements (OTP, API key creation) implement the
// pipeline directly instead of using this wrapper.

import { handleCorsPreflight } from './cors.ts';
import { authenticateRequest, hasScope } from './authenticate.ts';
import { checkRateLimit } from './rateLimit.ts';
import { logRequest } from './logRequest.ts';
import { ok, fail, requestId, type ErrorCode } from './response.ts';

const MAX_BODY_BYTES = 200_000;

export function defineEndpoint<TBody, TResult>(
  endpoint: string,
  scope: string,
  validate: (body: unknown) => { value: TBody } | { error: string },
  execute: (body: TBody) => TResult | Promise<TResult>
) {
  return async (req: Request): Promise<Response> => {
    const preflight = handleCorsPreflight(req);
    if (preflight) return preflight;

    const reqId = requestId();
    const startedAt = Date.now();

    const auth = await authenticateRequest(req);
    if (!auth.ok) return fail(auth.code, auth.message, reqId);
    const { context } = auth;

    if (!hasScope(context, scope)) {
      await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 403, startedAt, errorCode: 'PERMISSION_DENIED' });
      return fail('PERMISSION_DENIED', `This API key does not have the "${scope}" scope.`, reqId);
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

    let parsedBody: unknown;
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
      return fail('INVALID_INPUT', 'Request body must be valid JSON.', reqId);
    }

    const validated = validate(parsedBody);
    if ('error' in validated) {
      await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
      return fail('INVALID_INPUT', validated.error, reqId);
    }

    try {
      const result = await execute(validated.value);
      await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 200, startedAt });
      return ok(result, reqId);
    } catch (e) {
      const code: ErrorCode = 'INVALID_INPUT';
      await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: code });
      return fail(code, e instanceof Error ? e.message : 'Unable to process request.', reqId);
    }
  };
}
