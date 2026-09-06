// _shared/logRequest.ts
// Records safe request metadata only — never bodies, secrets, or OTP codes.

import type { AuthContext } from './authenticate.ts';

export async function logRequest(params: {
  context: AuthContext;
  requestId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  startedAt: number;
  errorCode?: string;
  ipAddress?: string | null;
}): Promise<void> {
  const { context, requestId: reqId, endpoint, method, statusCode, startedAt, errorCode, ipAddress } = params;

  await context.admin.from('request_logs').insert({
    request_id: reqId,
    project_id: context.projectId,
    api_key_id: context.apiKeyId,
    endpoint,
    method,
    status_code: statusCode,
    response_time_ms: Date.now() - startedAt,
    environment: context.environment,
    error_code: errorCode ?? null,
    ip_address: ipAddress ?? null
  });
}
