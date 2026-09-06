import { supabase } from '@/lib/supabase';
import type { ApiKey } from '@/types/database';

export async function listApiKeysForProject(projectId: string): Promise<ApiKey[]> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ApiKey[];
}

export async function revokeApiKey(id: string): Promise<void> {
  await callKeyFunction(id, 'revoke');
}

export async function rotateApiKey(id: string): Promise<ApiKey & { secret: string }> {
  return callKeyFunction(id, 'rotate');
}

async function callKeyFunction(keyId: string, action: 'rotate' | 'revoke') {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Not authenticated.');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const response = await fetch(`${supabaseUrl}/functions/v1/api-keys-rotate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key_id: keyId, action })
  });
  const json = await response.json();
  if (!response.ok || !json.success) throw new Error(json?.error?.message ?? `Failed to ${action} key.`);
  return json.data;
}

/**
 * Creates an API key via the api-keys-create Edge Function so that secret
 * generation and hashing happen server-side. Returns the full secret exactly
 * once — the caller is responsible for showing it to the user and never
 * persisting it client-side beyond the current render.
 */
export async function createApiKey(params: {
  projectId: string;
  name: string;
  environment: 'test' | 'live';
  scopes?: string[];
}): Promise<ApiKey & { secret: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Not authenticated.');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const response = await fetch(`${supabaseUrl}/functions/v1/api-keys-create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      project_id: params.projectId,
      name: params.name,
      environment: params.environment,
      ...(params.scopes && params.scopes.length > 0 ? { scopes: params.scopes } : {})
    })
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json?.error?.message ?? 'Failed to create API key.');
  }
  return json.data as ApiKey & { secret: string };
}
