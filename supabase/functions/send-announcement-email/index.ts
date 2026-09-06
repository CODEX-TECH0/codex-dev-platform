// supabase/functions/send-announcement-email/index.ts
// POST — body: { announcement_id: string }
//
// Called by the Super Admin app right after an announcement is created.
// Verifies the caller is a super admin (same RLS-backed pattern as
// admin-suspend-user), resolves the recipient list for the announcement's
// audience, deduplicates it, filters it by each recipient's own
// notification preferences, then:
//   - if channels includes "in_app": inserts one row per (preference-
//     filtered) recipient into `notifications` — this is the only thing
//     that ever populates that table.
//   - if channels includes "email": sends via Resend to the (separately)
//     preference-filtered email list.
// Both steps need the service role client (notifications has no INSERT
// policy for normal users by design), so this always runs as one
// privileged call regardless of which channels are selected.
//
// Error handling: in-app and email are independent — a failure in one
// (e.g. RESEND_API_KEY not configured) is captured and reported back but
// never prevents or overwrites a genuine success in the other. Every
// failure is logged server-side (console.error, safe — no secrets in these
// error paths) and returned in the response body as
// notifications_error / email_error so the admin UI can show it rather
// than silently reporting "published" when a channel actually failed.
//
// Preference filtering: user_preferences.in_app_announcements gates the
// in-app fan-out. For email, severity maps to which toggle governs it —
// "critical" (security-classified) checks email_security_alerts;
// "important"/"info" check email_product_updates. A user with no
// preferences row yet is treated as opted-in (matches the table's column
// defaults), never silently excluded just for not having visited Settings.
//
// Audience resolution:
//   everyone / developers -> all profiles
//   free / pro / enterprise -> profiles belonging to an organization on that plan
//   specific -> announcements.audience_user_ids
// Recipients are deduplicated by id before any fan-out, regardless of path.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { handleCorsPreflight } from '../_shared/cors.ts';
import { ok, fail, requestId } from '../_shared/response.ts';

const BATCH_SIZE = 50; // Resend and most providers cap recipients per call; batch conservatively.

interface Recipient {
  id: string;
  email: string;
}

interface PreferenceRow {
  user_id: string;
  email_product_updates: boolean;
  email_security_alerts: boolean;
  in_app_announcements: boolean;
}

function dedupeRecipients(list: Recipient[]): Recipient[] {
  const seen = new Map<string, Recipient>();
  for (const r of list) {
    if (r.id && r.email && !seen.has(r.id)) seen.set(r.id, r);
  }
  return [...seen.values()];
}

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
  if (callerError || !caller) return fail('INVALID_API_KEY', 'You must be signed in.', reqId);

  const { data: adminRow } = await userClient.from('admin_roles').select('id').eq('user_id', caller.id).maybeSingle();
  if (!adminRow) return fail('PERMISSION_DENIED', 'Super Admin privileges are required.', reqId);

  const body = await req.json().catch(() => ({}));
  const { announcement_id } = body as { announcement_id?: string };
  if (!announcement_id) return fail('INVALID_INPUT', 'announcement_id is required.', reqId);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false }
  });

  const { data: announcement, error: annError } = await admin
    .from('announcements')
    .select('id, title, body, severity, audience, audience_user_ids, channels')
    .eq('id', announcement_id)
    .maybeSingle();

  if (annError || !announcement) return fail('NOT_FOUND', 'Announcement not found.', reqId);

  let recipients: Recipient[] = [];

  if (announcement.audience === 'specific' && announcement.audience_user_ids?.length) {
    const { data } = await admin.from('profiles').select('id, email').in('id', announcement.audience_user_ids);
    recipients = data ?? [];
  } else if (announcement.audience === 'everyone' || announcement.audience === 'developers') {
    const { data } = await admin.from('profiles').select('id, email');
    recipients = data ?? [];
  } else {
    // free / pro / enterprise -> plan lives on organizations, joined through membership
    const { data: orgs } = await admin.from('organizations').select('id').eq('plan', announcement.audience);
    const orgIds = (orgs ?? []).map((o) => o.id);
    if (orgIds.length > 0) {
      const { data: members } = await admin
        .from('organization_members')
        .select('user_id')
        .in('organization_id', orgIds);
      const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
      if (userIds.length > 0) {
        const { data } = await admin.from('profiles').select('id, email').in('id', userIds);
        recipients = data ?? [];
      }
    }
  }

  recipients = dedupeRecipients(recipients);

  // Load preferences for every candidate recipient in one query; anyone
  // without a row is treated as opted-in on every channel (table defaults).
  const preferencesByUserId = new Map<string, PreferenceRow>();
  if (recipients.length > 0) {
    const { data: prefRows } = await admin
      .from('user_preferences')
      .select('user_id, email_product_updates, email_security_alerts, in_app_announcements')
      .in(
        'user_id',
        recipients.map((r) => r.id)
      );
    for (const row of (prefRows ?? []) as PreferenceRow[]) {
      preferencesByUserId.set(row.user_id, row);
    }
  }

  function emailOptedIn(userId: string): boolean {
    const pref = preferencesByUserId.get(userId);
    if (!pref) return true;
    return announcement.severity === 'critical' ? pref.email_security_alerts : pref.email_product_updates;
  }

  function inAppOptedIn(userId: string): boolean {
    const pref = preferencesByUserId.get(userId);
    if (!pref) return true;
    return pref.in_app_announcements;
  }

  // --- In-app fan-out: independent of email, failure here is captured and
  // reported, never silently swallowed, and never blocks the email path.
  let notificationsCreated = 0;
  let notificationsAttempted = 0;
  let notificationsError: string | null = null;

  if (announcement.channels.includes('in_app')) {
    const inAppRecipients = recipients.filter((r) => inAppOptedIn(r.id));
    notificationsAttempted = inAppRecipients.length;
    if (inAppRecipients.length > 0) {
      const rows = inAppRecipients.map((r) => ({
        user_id: r.id,
        announcement_id: announcement.id,
        title: announcement.title,
        body: announcement.body
      }));
      const { error: notifError, count } = await admin.from('notifications').insert(rows, { count: 'exact' });
      if (notifError) {
        // Logged server-side for observability; a sanitized version (no
        // internal schema/query detail beyond Postgres's own message) goes
        // back to the admin UI so "published" can never silently mean
        // "nothing was actually delivered."
        console.error('send-announcement-email: notifications insert failed', {
          announcement_id,
          attempted: rows.length,
          error: notifError.message
        });
        notificationsError = notifError.message;
      } else {
        notificationsCreated = count ?? rows.length;
      }
    }
  }

  // --- Email fan-out: independent of in-app. A failure here (including a
  // missing RESEND_API_KEY) is captured, never thrown as a hard failure
  // that would discard an already-successful in-app result above.
  let sentEmails = 0;
  let emailAttempted = 0;
  let emailError: string | null = null;

  if (announcement.channels.includes('email')) {
    const emailRecipients = recipients.filter((r) => emailOptedIn(r.id)).map((r) => r.email);
    emailAttempted = emailRecipients.length;
    if (emailRecipients.length > 0) {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        emailError = 'RESEND_API_KEY is not configured for this project.';
        console.error('send-announcement-email: RESEND_API_KEY missing', { announcement_id });
      } else {
        for (let i = 0; i < emailRecipients.length; i += BATCH_SIZE) {
          const batch = emailRecipients.slice(i, i + BATCH_SIZE);
          try {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: 'Codex <announcements@codex.dev>',
                to: batch,
                subject: announcement.title,
                text: announcement.body
              })
            });
            if (res.ok) {
              sentEmails += batch.length;
            } else {
              const detail = await res.text().catch(() => res.statusText);
              emailError = `Resend returned ${res.status}: ${detail.slice(0, 200)}`;
              console.error('send-announcement-email: Resend send failed', { announcement_id, status: res.status, detail });
            }
          } catch (e) {
            emailError = e instanceof Error ? e.message : 'Email send failed.';
            console.error('send-announcement-email: Resend request threw', { announcement_id, error: emailError });
          }
        }
      }
    }
  }

  await admin.from('audit_logs').insert({
    actor_id: caller.id,
    actor_type: 'admin',
    action: 'announcement.publish_fanout',
    resource_type: 'announcement',
    resource_id: announcement_id,
    context: {
      candidate_recipients: recipients.length,
      notifications_attempted: notificationsAttempted,
      notifications_created: notificationsCreated,
      notifications_failed: !!notificationsError,
      emails_attempted: emailAttempted,
      emails_sent: sentEmails,
      email_failed: !!emailError
    },
    result: notificationsError || emailError ? 'failure' : 'success'
  });

  return ok(
    {
      notifications_attempted: notificationsAttempted,
      notifications_created: notificationsCreated,
      notifications_error: notificationsError,
      emails_attempted: emailAttempted,
      emails_sent: sentEmails,
      email_error: emailError
    },
    reqId
  );
});
