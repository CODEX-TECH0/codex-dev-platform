// _shared/authenticate.ts
// Centralized pipeline: every protected /v1/* endpoint calls authenticateRequest()
// once at the top of its handler instead of re-implementing this logic.
//
// Pipeline (per spec section 13):
// key present? -> key valid? -> key active? -> project active? -> permission?
// -> rate limit ok? (checked by caller after this returns, see rateLimit.ts)

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { sha256Hex } from './crypto.ts';

export interface AuthContext {
  apiKeyId: string;
  projectId: string;
  organizationId: string;
  environment: 'test' | 'live';
  scopes: string[];
  admin: SupabaseClient; // service-role client for privileged writes (usage/logs)
}

export type AuthResult =
  | { ok: true; context: AuthContext }
  | { ok: false; code: 'MISSING_API_KEY' | 'INVALID_API_KEY' | 'KEY_REVOKED' | 'KEY_EXPIRED' | 'PROJECT_INACTIVE'; message: string };

export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(cx_(test|live)_[a-f0-9]+)$/);

  if (!match) {
    return { ok: false, code: 'MISSING_API_KEY', message: 'Missing or malformed Authorization header.' };
  }

  const fullSecret = match[1];
  const environment = match[2] as 'test' | 'live';
  const keyHash = await sha256Hex(fullSecret);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const { data: key, error } = await admin
    .from('api_keys')
    .select('id, project_id, environment, scopes, status, expires_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error || !key) {
    return { ok: false, code: 'INVALID_API_KEY', message: 'The API key is invalid or has been revoked.' };
  }

  if (key.status === 'revoked') {
    return { ok: false, code: 'KEY_REVOKED', message: 'This API key has been revoked.' };
  }

  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return { ok: false, code: 'KEY_EXPIRED', message: 'This API key has expired.' };
  }

  if (key.environment !== environment) {
    return { ok: false, code: 'INVALID_API_KEY', message: 'Key/environment mismatch.' };
  }

  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('id, organization_id, status')
    .eq('id', key.project_id)
    .maybeSingle();

  if (projectError || !project || project.status !== 'active') {
    return { ok: false, code: 'PROJECT_INACTIVE', message: 'The project associated with this key is not active.' };
  }

  // Fire-and-forget last_used_at update — does not block the response.
  admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id).then(() => {});

  return {
    ok: true,
    context: {
      apiKeyId: key.id,
      projectId: project.id,
      organizationId: project.organization_id,
      environment,
      scopes: key.scopes ?? ['*'],
      admin
    }
  };
}

export function hasScope(context: AuthContext, scope: string): boolean {
  return context.scopes.includes('*') || context.scopes.includes(scope);
}
