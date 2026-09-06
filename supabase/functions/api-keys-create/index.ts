// supabase/functions/api-keys-create/index.ts
// POST — called by the authenticated developer dashboard (Supabase Auth JWT,
// not a Codex API key) to create a new project API key.
//
// This runs as an Edge Function rather than a direct client insert because
// key generation and hashing must happen server-side: the frontend must
// never construct or see the hash logic, and the full secret must only ever
// exist in this function's memory and the HTTP response — never persisted.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { handleCorsPreflight } from '../_shared/cors.ts';
import { ok, fail, requestId } from '../_shared/response.ts';
import { generateApiKeySecret, sha256Hex } from '../_shared/crypto.ts';
import { dispatchWebhookEvent } from '../_shared/dispatchWebhooks.ts';

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const reqId = requestId();

  if (req.method !== 'POST') {
    return fail('INVALID_INPUT', 'Method not allowed.', reqId);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error: userError
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return fail('INVALID_API_KEY', 'You must be signed in to create an API key.', reqId);
  }

  let body: { project_id?: string; name?: string; environment?: 'test' | 'live'; scopes?: string[]; expires_at?: string };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return fail('INVALID_INPUT', 'Request body must be valid JSON.', reqId);
  }

  if (!body.project_id || !body.name || (body.environment !== 'test' && body.environment !== 'live')) {
    return fail('INVALID_INPUT', 'project_id, name, and environment ("test" | "live") are required.', reqId);
  }

  // Re-check membership using the caller's own JWT so RLS enforces it — this
  // also naturally rejects requests for projects the user cannot access.
  const { data: project, error: projectError } = await userClient
    .from('projects')
    .select('id')
    .eq('id', body.project_id)
    .maybeSingle();

  if (projectError || !project) {
    return fail('PERMISSION_DENIED', 'You do not have access to this project.', reqId);
  }

  const { fullSecret, prefix } = generateApiKeySecret(body.environment);
  const keyHash = await sha256Hex(fullSecret);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false }
  });

  const { data: created, error: insertError } = await admin
    .from('api_keys')
    .insert({
      project_id: body.project_id,
      name: body.name,
      key_prefix: prefix,
      key_hash: keyHash,
      environment: body.environment,
      scopes: body.scopes ?? ['*'],
      expires_at: body.expires_at ?? null,
      created_by: user.id
    })
    .select('id, name, key_prefix, environment, scopes, status, created_at')
    .single();

  if (insertError || !created) {
    return fail('INTERNAL_ERROR', 'Failed to create API key.', reqId);
  }

  await admin.from('audit_logs').insert({
    actor_id: user.id,
    actor_type: 'user',
    action: 'api_key.create',
    resource_type: 'api_key',
    resource_id: created.id,
    context: { project_id: body.project_id, environment: body.environment },
    result: 'success'
  });

  await dispatchWebhookEvent(admin, body.project_id, 'api_key.created', {
    api_key_id: created.id,
    name: created.name,
    environment: created.environment
  });

  // The full secret is returned exactly once and never stored anywhere.
  return ok({ ...created, secret: fullSecret }, reqId, 201);
});
