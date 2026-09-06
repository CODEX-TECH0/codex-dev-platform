import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';

export async function listMyProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as Project | null;
}

/** Creates a project inside the caller's first available organization. */
export async function createProject(params: {
  organizationId: string;
  name: string;
  description?: string;
  createdBy: string;
}): Promise<Project> {
  const slug = params.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const { data, error } = await supabase
    .from('projects')
    .insert({
      organization_id: params.organizationId,
      name: params.name,
      slug,
      description: params.description ?? null,
      created_by: params.createdBy
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as unknown as Project;
}

export async function renameProject(id: string, name: string): Promise<void> {
  await callProjectUpdate(id, { name });
}

export async function updateProjectSettings(id: string, updates: { description?: string; status?: string }): Promise<void> {
  await callProjectUpdate(id, updates);
}

async function callProjectUpdate(projectId: string, updates: Record<string, unknown>): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Not authenticated.');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const response = await fetch(`${supabaseUrl}/functions/v1/projects-update`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, ...updates })
  });
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json?.error?.message ?? 'Failed to update project.');
  }
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Ensures the current user has a default organization, creating one
 * atomically (organization + owner membership in a single server-side
 * transaction) if needed via the get_or_create_default_organization RPC.
 * Idempotent and race-free — see migration 0007 for why the previous
 * 3-step client-side flow (select, insert org, insert membership) could
 * fail with a 403 on the membership insert for every brand-new developer.
 * Identity is derived from the caller's JWT server-side (auth.uid()) —
 * there is no user id parameter to pass or spoof.
 */
export async function getOrCreateDefaultOrganization(userEmail: string): Promise<string> {
  const localPart = userEmail.split('@')[0] || 'user';
  const { data, error } = await supabase.rpc('get_or_create_default_organization', {
    p_name: `${localPart}'s Organization`,
    p_slug_base: localPart
  });
  if (error) throw error;
  return data as string;
}
