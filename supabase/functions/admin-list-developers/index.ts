// supabase/functions/admin-list-developers/index.ts
// GET — Super Admin only.
//
// Why this exists instead of the Super Admin app querying `profiles`
// directly with the anon client: the "profiles_select_own_or_admin" RLS
// policy (id = auth.uid() OR is_super_admin()) is written correctly and
// should already return every row to an admin, but a listing page this
// security-sensitive should not depend on an OR-clause in RLS being read
// correctly by every future maintainer who touches that policy — one typo'd
// AND instead of OR silently scopes every admin back down to "see only
// yourself," which is exactly the symptom this function exists to make
// structurally impossible. Using the service role here means the result is
// never subject to RLS at all: verification happens once, explicitly, in
// this function, via the caller's own JWT — not by hoping a policy
// evaluates the way it looks like it should.
//
// This also closes a real gap from the previous build: the Developers page
// could not show whether an account was actually suspended, because
// ban_duration lives on auth.users, not on profiles, and only the Admin API
// (service role) can read it. This function joins that in.
//
// Excludes Super Admin accounts from the returned list and total: this is
// explicitly a Developers page, and a Super Admin who also happens to have
// a profiles row (every account gets one, admin or not) previously showed
// up in it, and inflated the count — a real, confirmed bug, not a
// hypothetical one, fixed here by filtering out anyone present in
// admin_roles before returning.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { handleCorsPreflight } from '../_shared/cors.ts';
import { ok, fail, requestId } from '../_shared/response.ts';

interface AuthUserLite {
  id: string;
  banned_until: string | null;
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const reqId = requestId();
  if (req.method !== 'GET') return fail('INVALID_INPUT', 'Method not allowed.', reqId);

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  });

  const {
    data: { user: caller },
    error: callerError
  } = await userClient.auth.getUser();
  if (callerError || !caller) return fail('INVALID_API_KEY', 'You must be signed in.', reqId);

  // Explicit server-side admin check via the caller's own RLS-scoped
  // session — this is the actual authorization gate, not the query below.
  const { data: adminRow } = await userClient.from('admin_roles').select('id').eq('user_id', caller.id).maybeSingle();
  if (!adminRow) return fail('PERMISSION_DENIED', 'Super Admin privileges are required.', reqId);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false }
  });

  const [{ data: profiles, error: profilesError }, { data: adminRows, error: adminRowsError }] = await Promise.all([
    admin.from('profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }).limit(500),
    admin.from('admin_roles').select('user_id')
  ]);

  if (profilesError) return fail('INTERNAL_ERROR', 'Failed to load developers.', reqId);
  if (adminRowsError) return fail('INTERNAL_ERROR', 'Failed to resolve admin accounts.', reqId);

  const adminUserIds = new Set((adminRows ?? []).map((r) => r.user_id));
  const developerProfiles = (profiles ?? []).filter((p) => !adminUserIds.has(p.id));

  // Walk auth.admin.listUsers() pages to build an id -> banned_until map.
  // Page size 200 keeps this to a handful of requests even at a few
  // thousand users; fine for beta scale.
  const banStatusByUserId = new Map<string, string | null>();
  let page = 1;
  const perPage = 200;
  for (let i = 0; i < 25; i++) {
    // hard cap: 25 * 200 = 5,000 users, well beyond beta scale
    const { data: pageData, error: listError } = await admin.auth.admin.listUsers({ page, perPage });
    if (listError || !pageData) break;
    for (const u of pageData.users as unknown as AuthUserLite[]) {
      banStatusByUserId.set(u.id, u.banned_until ?? null);
    }
    if (pageData.users.length < perPage) break;
    page += 1;
  }

  const developers = developerProfiles.map((p) => {
    const bannedUntil = banStatusByUserId.get(p.id) ?? null;
    const isSuspended = !!bannedUntil && new Date(bannedUntil) > new Date();
    return { ...p, suspended: isSuspended };
  });

  return ok({ developers, total: developers.length }, reqId);
});
