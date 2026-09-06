// supabase/functions/otp-send/index.ts
// POST /v1/otp/send
// Body: { recipient: string, channel?: "email" }
//
// V1 supports email OTP via Resend. SMS/TOTP channels are represented in the
// schema (otp_verifications.channel) so they can be added later without a
// migration, but are rejected here with INVALID_INPUT until implemented.
//
// Security: the raw code is never stored — only its SHA-256 hash. The raw
// code is never logged. In test-mode, the code is returned in the response
// so developers can build against OTP without needing real email delivery;
// in live mode it is never returned in the API response.

import { handleCorsPreflight } from '../_shared/cors.ts';
import { authenticateRequest, hasScope } from '../_shared/authenticate.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { logRequest } from '../_shared/logRequest.ts';
import { ok, fail, requestId } from '../_shared/response.ts';
import { sha256Hex, generateOtpCode } from '../_shared/crypto.ts';

const OTP_TTL_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const reqId = requestId();
  const startedAt = Date.now();
  const endpoint = '/v1/otp/send';

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

  let body: { recipient?: string; channel?: string };
  try {
    body = JSON.parse(await req.text());
  } catch {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', 'Request body must be valid JSON.', reqId);
  }

  const channel = body.channel ?? 'email';
  if (channel !== 'email') {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', 'Only the "email" channel is supported in V1.', reqId);
  }

  if (typeof body.recipient !== 'string' || !EMAIL_RE.test(body.recipient)) {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 400, startedAt, errorCode: 'INVALID_INPUT' });
    return fail('INVALID_INPUT', 'recipient must be a valid email address.', reqId);
  }

  const code = generateOtpCode(6);
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  const { data: verification, error } = await context.admin
    .from('otp_verifications')
    .insert({
      project_id: context.projectId,
      api_key_id: context.apiKeyId,
      recipient: body.recipient,
      channel: 'email',
      code_hash: codeHash,
      environment: context.environment,
      max_attempts: MAX_ATTEMPTS,
      expires_at: expiresAt
    })
    .select('id')
    .single();

  if (error || !verification) {
    await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 500, startedAt, errorCode: 'INTERNAL_ERROR' });
    return fail('INTERNAL_ERROR', 'Failed to create OTP verification.', reqId);
  }

  if (context.environment === 'live') {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Codex <otp@codex.dev>',
          to: body.recipient,
          subject: 'Your Codex verification code',
          text: `Your verification code is ${code}. It expires in 5 minutes.`
        })
      }).catch((e) => console.error('Resend send failed', e));
    }
  }

  await logRequest({ context, requestId: reqId, endpoint, method: 'POST', statusCode: 200, startedAt });

  return ok(
    {
      verification_id: verification.id,
      expires_at: expiresAt,
      channel: 'email',
      // Only ever included in test mode — never in live responses or logs.
      ...(context.environment === 'test' ? { test_code: code } : {})
    },
    reqId
  );
});
