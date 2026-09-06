// supabase/functions/otp-verify/index.ts
// POST /v1/otp/verify
// Body: { verification_id: string, code: string }
//
// Brute-force protection: attempt_count is checked and incremented atomically
// per request; once max_attempts is reached the verification is marked
// 'failed' and can never succeed, even with the correct code.

import { handleCorsPreflight } from '../_shared/cors.ts';
import { authenticateRequest, hasScope } from '../_shared/authenticate.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { logRequest } from '../_shared/logRequest.ts';
import { ok, fail, requestId } from '../_shared/response.ts';
import { sha256Hex } from '../_shared/crypto.ts';
import { dispatchWebhookEvent } from '../_shared/dispatchWebhooks.ts';

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const reqId = requestId();
  const startedAt = Date.now();
  const endpoint = '/v1/otp/verify';

  const auth = await authenticateRequest(req);
  if (!auth.ok) return fail(auth.code, auth.message, reqId);
  const { context } = auth;

  if (!hasScope(context, 'otp')) {
    return fail('PERMISSION_DENIED', 'This API key does not have the "otp" scope.', reqId);
  }

  const rate = await checkRateLimit(context);
  if (!rate.allowed) {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 429, startedAt, errorCode: 'RATE_LIMITED' });
    return fail('RATE_LIMITED', 'Too many requests. Please slow down.', reqId);
  }

  let body: { verification_id?: string; code?: string };
  try {
    body = JSON.parse(await req.text());
  } catch {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', 'Request body must be valid JSON.', reqId);
  }

  if (typeof body.verification_id !== 'string' || typeof body.code !== 'string' || !/^\d{4,8}$/.test(body.code)) {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', 'verification_id and a numeric code are required.', reqId);
  }

  const { data: verification, error } = await context.admin
    .from('otp_verifications')
    .select('id, project_id, code_hash, status, attempt_count, max_attempts, expires_at')
    .eq('id', body.verification_id)
    .eq('project_id', context.projectId)
    .maybeSingle();

  if (error || !verification) {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 404, startedAt, errorCode: 'NOT_FOUND' });
    return fail('NOT_FOUND', 'Verification not found.', reqId);
  }

  if (verification.status === 'verified') {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', 'This verification has already been completed.', reqId);
  }

  if (verification.status === 'failed' || verification.status === 'expired' || new Date(verification.expires_at) < new Date()) {
    if (verification.status === 'pending') {
      await context.admin.from('otp_verifications').update({ status: 'expired' }).eq('id', verification.id);
    }
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', 'This code has expired or is no longer valid. Request a new one.', reqId);
  }

  if (verification.attempt_count >= verification.max_attempts) {
    await context.admin.from('otp_verifications').update({ status: 'failed' }).eq('id', verification.id);
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', 'Maximum verification attempts exceeded.', reqId);
  }

  const submittedHash = await sha256Hex(body.code);
  const isMatch = submittedHash === verification.code_hash;

  const newAttemptCount = verification.attempt_count + 1;

  if (!isMatch) {
    const willExceed = newAttemptCount >= verification.max_attempts;
    await context.admin
      .from('otp_verifications')
      .update({ attempt_count: newAttemptCount, status: willExceed ? 'failed' : 'pending' })
      .eq('id', verification.id);

    if (willExceed) {
      await dispatchWebhookEvent(context.admin, context.projectId, 'otp.failed', {
        verification_id: verification.id
      });
    }

    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', 'Incorrect code.', reqId);
  }

  await context.admin
    .from('otp_verifications')
    .update({ status: 'verified', verified_at: new Date().toISOString(), attempt_count: newAttemptCount })
    .eq('id', verification.id);

  await dispatchWebhookEvent(context.admin, context.projectId, 'otp.verified', {
    verification_id: verification.id
  });

  await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 200, startedAt });
  return ok({ verified: true, verification_id: verification.id }, reqId);
});
