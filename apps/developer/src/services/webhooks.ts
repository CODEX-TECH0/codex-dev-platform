import { supabase } from '@/lib/supabase';

export interface Webhook {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  events: string[];
  status: 'active' | 'disabled';
  created_at: string;
}

const AVAILABLE_EVENTS = ['otp.verified', 'otp.failed', 'project.updated', 'api_key.created', 'api_key.revoked'] as const;
export { AVAILABLE_EVENTS };

async function authedFetch(path: string, init?: RequestInit) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Not authenticated.');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/webhooks${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Request failed.');
  return json.data;
}

export async function listWebhooks(projectId: string): Promise<Webhook[]> {
  const data = await authedFetch(`?project_id=${encodeURIComponent(projectId)}`);
  return data.webhooks as Webhook[];
}

export async function createWebhook(params: {
  projectId: string;
  url: string;
  events: string[];
  description?: string;
}): Promise<Webhook & { signing_secret: string }> {
  return authedFetch('', {
    method: 'POST',
    body: JSON.stringify({ project_id: params.projectId, url: params.url, events: params.events, description: params.description })
  });
}

export async function updateWebhookStatus(id: string, status: 'active' | 'disabled'): Promise<Webhook> {
  return authedFetch(`/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function deleteWebhook(id: string): Promise<void> {
  await authedFetch(`/${id}`, { method: 'DELETE' });
}

export async function testWebhook(id: string): Promise<{ event_id: string; delivery_status: string; response_status_code: number | null }> {
  return authedFetch(`/${id}/test`, { method: 'POST' });
}
