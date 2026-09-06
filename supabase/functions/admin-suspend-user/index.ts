// supabase/functions/admin-suspend-user/index.ts
// POST — body: { user_id: string, action: "suspend" | "reinstate", reason?: string }
//
// Called only from the Super Admin app. Verifies the CALLER is a super admin
// using their own JWT (RLS-backed, via admin_roles) before doing anything —
// never trusts a client-supplied "isAdmin" flag. Suspension itself uses the
// Supabase Auth Admin API (auth.admin.updateUserById with ban_duration),
// which requires the service role key and therefore can only run here, never
// in the browser.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { handleCorsPreflight } from '../_shared/cors.ts';
import { ok, fail, requestId } from '../_shared/response.ts';

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
    data: { user: caller },
    error: callerError
  } = await userClient.auth.getUser();

  if (callerError || !caller) {
    return fail('INVALID_API_KEY', 'You must be signed in.', reqId);
  }

  // RLS on admin_roles only returns a row when it belongs to the caller, so
  // this is a true server-verified admin check, not a client-supplied flag.
  const { data: adminRow } = await userClient.from('admin_roles').select('id').eq('user_id', caller.id).maybeSingle();
  if (!adminRow) {
    return fail('PERMISSION_DENIED', 'Super Admin privileges are required for this action.', reqId);
  }

  const body = await req.json().catch(() => ({}));
  const { user_id, action, reason } = body as { user_id?: string; action?: string; reason?: string };

  if (!user_id || (action !== 'suspend' && action !== 'reinstate')) {
    return fail('INVALID_INPUT', 'user_id and action ("suspend" | "reinstate") are required.', reqId);
  }

  if (user_id === caller.id) {
    return fail('INVALID_INPUT', 'You cannot suspend your own account.', reqId);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false }
  });

  // ban_duration accepts a Postgres interval string, or "none" to lift a ban.
  const { error: updateError } = await admin.auth.admin.updateUserById(user_id, {
    ban_duration: action === 'suspend' ? '87600h' : 'none' // ~10 years == effectively indefinite, reversible
  });

  if (updateError) {
    return fail('INTERNAL_ERROR', `Failed to ${action} user: ${updateError.message}`, reqId);
  }

  await admin.from('audit_logs').insert({
    actor_id: caller.id,
    actor_type: 'admin',
    action: action === 'suspend' ? 'developer.suspend' : 'developer.reinstate',
    resource_type: 'profile',
    resource_id: user_id,
    context: reason ? { reason } : null,
    result: 'success'
  });

  return ok({ user_id, action, applied: true }, reqId);
});
