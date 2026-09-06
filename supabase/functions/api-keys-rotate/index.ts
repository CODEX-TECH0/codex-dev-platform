// supabase/functions/api-keys-rotate/index.ts
// POST — body: { key_id: string, action: "rotate" | "revoke" }
//
// Called by the authenticated dashboard (Supabase Auth JWT). "rotate"
// generates a brand new secret for the same key row (same id, name,
// project, scopes) and immediately invalidates the old one — the old
// secret's hash is overwritten, so it stops authenticating instantly.
// "revoke" just marks the key revoked, same as a direct client update would,
// but routed through here so it can also fire the api_key.revoked webhook
// event (which requires the service role client to read/decrypt other
// webhooks' signing secrets).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { handleCorsPreflight } from '../_shared/cors.ts';
import { ok, fail, requestId } from '../_shared/response.ts';
import { generateApiKeySecret, sha256Hex } from '../_shared/crypto.ts';
import { dispatchWebhookEvent } from '../_shared/dispatchWebhooks.ts';

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const reqId = requestId();
  if (req.method !== 'POST') return fail('INVALID_INPUT', 'Method not allowed.', reqId);

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  });

  const {
    data: { user },
    error: userError
  } = await userClient.auth.getUser();
  if (userError || !user) return fail('INVALID_API_KEY', 'You must be signed in.', reqId);

  const body = await req.json().catch(() => ({}));
  const { key_id, action } = body as { key_id?: string; action?: string };

  if (!key_id || (action !== 'rotate' && action !== 'revoke')) {
    return fail('INVALID_INPUT', 'key_id and action ("rotate" | "revoke") are required.', reqId);
  }

  // Confirms the caller can see this key at all (RLS-enforced project
  // membership) before doing anything privileged with it.
  const { data: existing } = await userClient
    .from('api_keys')
    .select('id, project_id, name, environment, status')
    .eq('id', key_id)
    .maybeSingle();

  if (!existing) return fail('PERMISSION_DENIED', 'You do not have access to this API key.', reqId);
  if (existing.status !== 'active') return fail('INVALID_INPUT', 'This key is not active.', reqId);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false }
  });

  if (action === 'revoke') {
    const { error } = await admin
      .from('api_keys')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', key_id);
    if (error) return fail('INTERNAL_ERROR', 'Failed to revoke key.', reqId);

    await admin.from('audit_logs').insert({
      actor_id: user.id,
      actor_type: 'user',
      action: 'api_key.revoke',
      resource_type: 'api_key',
      resource_id: key_id,
      result: 'success'
    });

    await dispatchWebhookEvent(admin, existing.project_id, 'api_key.revoked', {
      api_key_id: key_id,
      name: existing.name
    });

    return ok({ key_id, action: 'revoke', applied: true }, reqId);
  }

  // action === 'rotate'
  const { fullSecret, prefix } = generateApiKeySecret(existing.environment as 'test' | 'live');
  const keyHash = await sha256Hex(fullSecret);

  const { data: updated, error } = await admin
    .from('api_keys')
    .update({ key_prefix: prefix, key_hash: keyHash, last_used_at: null })
    .eq('id', key_id)
    .select('id, name, key_prefix, environment, scopes, status, created_at')
    .single();

  if (error || !updated) return fail('INTERNAL_ERROR', 'Failed to rotate key.', reqId);

  await admin.from('audit_logs').insert({
    actor_id: user.id,
    actor_type: 'user',
    action: 'api_key.rotate',
    resource_type: 'api_key',
    resource_id: key_id,
    result: 'success'
  });

  return ok({ ...updated, secret: fullSecret }, reqId);
});
