// supabase/functions/projects-update/index.ts
// POST — body: { project_id: string, name?: string, description?: string, status?: "active"|"archived"|"suspended" }
//
// Functionally, project renames/status changes could stay as plain
// RLS-permitted client updates (the "projects_update_org_member_or_admin"
// policy already allows this) — no privileged operation is required. This
// function exists purely so that a project change can dispatch the
// project.updated webhook event, since only a service-role client can read
// other webhooks' encrypted signing secrets to sign the delivery. If you'd
// rather keep project edits as simple direct updates and skip the
// project.updated event entirely, deleting this function and reverting the
// frontend to call supabase.from('projects').update(...) directly is a
// completely valid simplification.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { handleCorsPreflight } from '../_shared/cors.ts';
import { ok, fail, requestId } from '../_shared/response.ts';
import { dispatchWebhookEvent } from '../_shared/dispatchWebhooks.ts';

const VALID_STATUSES = ['active', 'archived', 'suspended'];

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
  const { project_id, name, description, status } = body as {
    project_id?: string;
    name?: string;
    description?: string;
    status?: string;
  };

  if (!project_id) return fail('INVALID_INPUT', 'project_id is required.', reqId);
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return fail('INVALID_INPUT', `status must be one of ${VALID_STATUSES.join(', ')}.`, reqId);
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (Object.keys(updates).length === 0) return fail('INVALID_INPUT', 'No fields to update.', reqId);

  // Confirms membership via RLS using the caller's own JWT before doing
  // anything privileged.
  const { data: updated, error } = await userClient
    .from('projects')
    .update(updates)
    .eq('id', project_id)
    .select('id, name, description, status, updated_at')
    .maybeSingle();

  if (error || !updated) return fail('PERMISSION_DENIED', 'You do not have access to this project.', reqId);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false }
  });

  await dispatchWebhookEvent(admin, project_id, 'project.updated', {
    project_id,
    changed_fields: Object.keys(updates)
  });

  return ok(updated, reqId);
});
