// _shared/response.ts
// Standardized success/error envelope used by every Codex API v1 endpoint.

import { corsHeaders } from './cors.ts';

export function requestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

export function ok(data: unknown, reqId: string, status = 200): Response {
  return new Response(
    JSON.stringify({ success: true, data, request_id: reqId }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

export type ErrorCode =
  | 'INVALID_API_KEY'
  | 'MISSING_API_KEY'
  | 'KEY_REVOKED'
  | 'KEY_EXPIRED'
  | 'PROJECT_INACTIVE'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'REQUEST_TOO_LARGE'
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  INVALID_API_KEY: 401,
  MISSING_API_KEY: 401,
  KEY_REVOKED: 401,
  KEY_EXPIRED: 401,
  PROJECT_INACTIVE: 403,
  PERMISSION_DENIED: 403,
  RATE_LIMITED: 429,
  REQUEST_TOO_LARGE: 413,
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
};

export function fail(code: ErrorCode, message: string, reqId: string): Response {
  return new Response(
    JSON.stringify({ success: false, error: { code, message }, request_id: reqId }),
    {
      status: STATUS_BY_CODE[code],
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
