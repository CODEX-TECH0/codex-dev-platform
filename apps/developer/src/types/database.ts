// Hand-written subset of the Supabase schema used by the frontend.
// For full type safety, generate this instead with:
//   supabase gen types typescript --project-id <ref> > src/types/database.ts

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: 'beta' | 'starter' | 'developer' | 'pro' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  status: 'active' | 'archived' | 'suspended';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  project_id: string;
  name: string;
  key_prefix: string;
  environment: 'test' | 'live';
  scopes: string[];
  status: 'active' | 'revoked' | 'expired';
  expires_at: string | null;
  last_used_at: string | null;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
}

export interface RequestLog {
  id: string;
  request_id: string;
  project_id: string | null;
  api_key_id: string | null;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  environment: 'test' | 'live';
  error_code: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

// Minimal Database type so `createClient<Database>` type-checks. Extend the
// `Row`/`Insert`/`Update` shapes per table as the app grows.
export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>;
  };
}
