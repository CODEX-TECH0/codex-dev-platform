import { supabase } from '@/lib/supabase';

export interface UserPreferences {
  user_id: string;
  email_product_updates: boolean;
  email_security_alerts: boolean;
  in_app_announcements: boolean;
  analytics_opt_in: boolean;
  default_project_id: string | null;
  api_explorer_default_environment: 'test' | 'live';
}

const DEFAULTS: Omit<UserPreferences, 'user_id'> = {
  email_product_updates: true,
  email_security_alerts: true,
  in_app_announcements: true,
  analytics_opt_in: true,
  default_project_id: null,
  api_explorer_default_environment: 'test'
};

export async function getPreferences(userId: string): Promise<UserPreferences> {
  const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return { user_id: userId, ...DEFAULTS };
  return data as unknown as UserPreferences;
}

export async function savePreferences(userId: string, updates: Partial<Omit<UserPreferences, 'user_id'>>): Promise<void> {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' });
  if (error) throw error;
}
