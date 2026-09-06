// supabase/functions/webhooks/index.ts
//
// Routes (path segments after the function name are preserved by the Edge
// Runtime, so these map onto the spec's REST-style webhook endpoints):
//   POST   /webhooks              -> create
//   GET    /webhooks              -> list (?project_id=...)
//   GET    /webhooks/{id}         -> get one
//   PATCH  /webhooks/{id}         -> update (url, events, status)
//   DELETE /webhooks/{id}         -> delete
//   POST   /webhooks/{id}/test    -> send a test delivery
//
// Called by the authenticated developer dashboard (Supabase Auth JWT) —
// membership is enforced by re-running reads/writes through the caller's own
// JWT so RLS decides access, exactly like api-keys-create. The service-role
// client is only used for the parts RLS can't do directly (reading the
// signing secret hash to compute a test signature, writing delivery logs).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { handleCorsPreflight } from '../_shared/cors.ts';
import { ok, fail, requestId } from '../_shared/response.ts';
import { generateWebhookSecret, encryptSecret, decryptSecret, hmacSha256Hex } from '../_shared/crypto.ts';

const MAX_EVENTS = 20;
const VALID_EVENTS = new Set([
  'otp.verified',
  'otp.failed',
  'project.updated',
  'api_key.created',
  'api_key.revoked'
]);

function getUserClient(authHeader: string) {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  });
}

function getAdminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false }
  });
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const reqId = requestId();
  const url = new URL(req.url);
  // Segments after "/webhooks" — e.g. ["", "id123", "test"] -> ["id123", "test"]
  const segments = url.pathname.replace(/^\/(webhooks\/?)?/, '').split('/').filter(Boolean);
  const webhookId = segments[0];
  const subresource = segments[1];

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = getUserClient(authHeader);
  const {
    data: { user },
    error: userError
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return fail('INVALID_API_KEY', 'You must be signed in to manage webhooks.', reqId);
  }

  try {
    if (req.method === 'POST' && !webhookId) return await handleCreate(req, userClient, user.id, reqId);
    if (req.method === 'GET' && !webhookId) return await handleList(req, userClient, reqId);
    if (req.method === 'GET' && webhookId) return await handleGet(userClient, webhookId, reqId);
    if (req.method === 'PATCH' && webhookId) return await handleUpdate(req, userClient, webhookId, reqId);
    if (req.method === 'DELETE' && webhookId) return await handleDelete(userClient, webhookId, reqId);
    if (req.method === 'POST' && webhookId && subresource === 'test') {
      return await handleTest(userClient, webhookId, reqId);
    }
    return fail('NOT_FOUND', 'No matching webhook route for this method/path.', reqId);
  } catch (e) {
    return fail('INTERNAL_ERROR', e instanceof Error ? e.message : 'Unexpected error.', reqId);
  }
});

async function handleCreate(req: Request, userClient: ReturnType<typeof getUserClient>, userId: string, reqId: string) {
  const body = await req.json().catch(() => ({}));
  const { project_id, url: targetUrl, events, description } = body as {
    project_id?: string;
    url?: string;
    events?: string[];
    description?: string;
  };

  if (!project_id || !targetUrl) return fail('INVALID_INPUT', 'project_id and url are required.', reqId);

  try {
    new URL(targetUrl);
  } catch {
    return fail('INVALID_INPUT', 'url must be a valid absolute URL.', reqId);
  }

  const eventList = Array.isArray(events) ? events.filter((e) => VALID_EVENTS.has(e)) : [];
  if (eventList.length === 0 || eventList.length > MAX_EVENTS) {
    return fail('INVALID_INPUT', `events must include 1-${MAX_EVENTS} valid event names.`, reqId);
  }

  // Confirms project access via RLS — throws/returns nothing if unauthorized.
  const { data: project } = await userClient.from('projects').select('id').eq('id', project_id).maybeSingle();
  if (!project) return fail('PERMISSION_DENIED', 'You do not have access to this project.', reqId);

  const secret = generateWebhookSecret();
  const secretEncrypted = await encryptSecret(secret);

  const admin = getAdminClient();
  const { data: created, error } = await admin
    .from('webhooks')
    .insert({
      project_id,
      url: targetUrl,
      description: description ?? null,
      events: eventList,
      signing_secret_encrypted: secretEncrypted,
      created_by: userId
    })
    .select('id, project_id, url, description, events, status, created_at')
    .single();

  if (error || !created) return fail('INTERNAL_ERROR', 'Failed to create webhook.', reqId);

  await admin.from('audit_logs').insert({
    actor_id: userId,
    actor_type: 'user',
    action: 'webhook.create',
    resource_type: 'webhook',
    resource_id: created.id,
    context: { project_id },
    result: 'success'
  });

  // The raw secret is shown once in the API response, same as API keys —
  // even though (unlike API keys) Codex retains a decryptable copy server
  // side to sign future deliveries, it is never returned by any endpoint
  // again after this response.
  return ok({ ...created, signing_secret: secret }, reqId, 201);
}

async function handleList(req: Request, userClient: ReturnType<typeof getUserClient>, reqId: string) {
  const projectId = new URL(req.url).searchParams.get('project_id');
  let query = userClient
    .from('webhooks')
    .select('id, project_id, url, description, events, status, created_at')
    .order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);

  const { data, error } = await query;
  if (error) return fail('INTERNAL_ERROR', 'Failed to list webhooks.', reqId);
  return ok({ webhooks: data ?? [] }, reqId);
}

async function handleGet(userClient: ReturnType<typeof getUserClient>, id: string, reqId: string) {
  const { data, error } = await userClient
    .from('webhooks')
    .select('id, project_id, url, description, events, status, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return fail('NOT_FOUND', 'Webhook not found.', reqId);
  return ok(data, reqId);
}

async function handleUpdate(req: Request, userClient: ReturnType<typeof getUserClient>, id: string, reqId: string) {
  const body = await req.json().catch(() => ({}));
  const { url: targetUrl, events, status, description } = body as {
    url?: string;
    events?: string[];
    status?: string;
    description?: string;
  };

  const updates: Record<string, unknown> = {};
  if (targetUrl !== undefined) {
    try {
      new URL(targetUrl);
    } catch {
      return fail('INVALID_INPUT', 'url must be a valid absolute URL.', reqId);
    }
    updates.url = targetUrl;
  }
  if (events !== undefined) {
    const eventList = events.filter((e) => VALID_EVENTS.has(e));
    if (eventList.length === 0) return fail('INVALID_INPUT', 'events must include at least one valid event name.', reqId);
    updates.events = eventList;
  }
  if (status !== undefined) {
    if (status !== 'active' && status !== 'disabled') return fail('INVALID_INPUT', 'status must be "active" or "disabled".', reqId);
    updates.status = status;
  }
  if (description !== undefined) updates.description = description;

  if (Object.keys(updates).length === 0) return fail('INVALID_INPUT', 'No valid fields to update.', reqId);

  const { data, error } = await userClient
    .from('webhooks')
    .update(updates)
    .eq('id', id)
    .select('id, project_id, url, description, events, status, created_at')
    .maybeSingle();

  if (error || !data) return fail('NOT_FOUND', 'Webhook not found or you do not have access.', reqId);
  return ok(data, reqId);
}

async function handleDelete(userClient: ReturnType<typeof getUserClient>, id: string, reqId: string) {
  const { error, count } = await userClient.from('webhooks').delete({ count: 'exact' }).eq('id', id);
  if (error || !count) return fail('NOT_FOUND', 'Webhook not found or you do not have access.', reqId);
  return ok({ deleted: true }, reqId);
}

async function handleTest(userClient: ReturnType<typeof getUserClient>, id: string, reqId: string) {
  // Confirm access via RLS first.
  const { data: webhook } = await userClient
    .from('webhooks')
    .select('id, url, events')
    .eq('id', id)
    .maybeSingle();
  if (!webhook) return fail('NOT_FOUND', 'Webhook not found or you do not have access.', reqId);

  const admin = getAdminClient();
  const { data: fullWebhook } = await admin
    .from('webhooks')
    .select('signing_secret_encrypted')
    .eq('id', id)
    .single();

  const eventId = `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  const payload = JSON.stringify({
    event_id: eventId,
    event_type: 'webhook.test',
    timestamp: new Date().toISOString(),
    data: { message: 'This is a test delivery from Codex.' }
  });

  // Decrypt the real signing secret and sign for real — this is a genuine
  // test of what production deliveries will look like, not a placeholder.
  const rawSecret = fullWebhook ? await decryptSecret(fullWebhook.signing_secret_encrypted) : '';
  const signature = rawSecret ? await hmacSha256Hex(rawSecret, payload) : '';

  let responseStatus: number | null = null;
  let deliveryStatus: 'delivered' | 'failed' = 'failed';
  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Codex-Signature': signature,
        'X-Codex-Event-Id': eventId,
        'X-Codex-Timestamp': new Date().toISOString()
      },
      body: payload
    });
    responseStatus = res.status;
    deliveryStatus = res.ok ? 'delivered' : 'failed';
  } catch {
    responseStatus = null;
    deliveryStatus = 'failed';
  }

  await admin.from('webhook_deliveries').insert({
    webhook_id: id,
    event_id: eventId,
    event_type: 'webhook.test',
    status: deliveryStatus,
    response_status_code: responseStatus,
    attempt_count: 1,
    delivered_at: deliveryStatus === 'delivered' ? new Date().toISOString() : null
  });

  return ok({ event_id: eventId, delivery_status: deliveryStatus, response_status_code: responseStatus }, reqId);
}
