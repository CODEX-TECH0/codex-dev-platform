// _shared/dispatchWebhooks.ts
// Called synchronously (awaited) by the endpoints that emit real Codex
// events, so that delivery — and its log row — completes before the Edge
// Function's response is sent (Deno Deploy does not guarantee background
// work survives after the response returns unless using
// EdgeRuntime.waitUntil, which isn't available in all environments this
// might run in, so we favor correctness over shaving a few ms of latency).
//
// Failure to deliver a webhook never fails the parent request — dispatch
// errors are swallowed after being logged to webhook_deliveries.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { decryptSecret, hmacSha256Hex } from './crypto.ts';

export type CodexEvent = 'otp.verified' | 'otp.failed' | 'project.updated' | 'api_key.created' | 'api_key.revoked';

export async function dispatchWebhookEvent(
  admin: SupabaseClient,
  projectId: string,
  eventType: CodexEvent,
  data: Record<string, unknown>
): Promise<void> {
  const { data: webhooks, error } = await admin
    .from('webhooks')
    .select('id, url, signing_secret_encrypted, events')
    .eq('project_id', projectId)
    .eq('status', 'active');

  if (error || !webhooks || webhooks.length === 0) return;

  const targets = webhooks.filter((w) => (w.events as string[]).includes(eventType));
  if (targets.length === 0) return;

  const eventId = `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  const payload = JSON.stringify({
    event_id: eventId,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    data
  });

  await Promise.all(
    targets.map(async (webhook) => {
      let responseStatus: number | null = null;
      let status: 'delivered' | 'failed' = 'failed';
      try {
        const secret = await decryptSecret(webhook.signing_secret_encrypted);
        const signature = await hmacSha256Hex(secret, payload);
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
        status = res.ok ? 'delivered' : 'failed';
      } catch {
        status = 'failed';
      }

      await admin.from('webhook_deliveries').insert({
        webhook_id: webhook.id,
        event_id: eventId,
        event_type: eventType,
        status,
        response_status_code: responseStatus,
        attempt_count: 1,
        delivered_at: status === 'delivered' ? new Date().toISOString() : null
      });
    })
  );
}
