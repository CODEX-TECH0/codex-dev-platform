import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Self-heals a missing profile row for the given user. The normal path is
 * the handle_new_user() trigger on auth.users (migration 0000), which
 * should always create this row at signup — this is a defensive backstop,
 * not the primary mechanism, for the case where that trigger ever didn't
 * fire for a given account (e.g. it was added to the schema after some
 * users already existed on a project). Uses upsert with ignoreDuplicates
 * so it's a safe no-op for every normal account that already has a row —
 * this runs on every session resolution, not just first login. Requires
 * the profiles_insert_own RLS policy (migration 0007); without it this
 * silently no-ops via RLS rather than throwing, which is fine — it's a
 * best-effort backstop, not something that should ever block sign-in.
 */
async function ensureProfileExists(user: User): Promise<void> {
  try {
    await supabase.from('profiles').upsert(
      { id: user.id, email: user.email ?? '', full_name: (user.user_metadata?.full_name as string) ?? null },
      { onConflict: 'id', ignoreDuplicates: true }
    );
  } catch {
    // Best-effort only — never block sign-in on this.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) void ensureProfileExists(data.session.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
      if (newSession?.user) void ensureProfileExists(newSession.user);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp: AuthState['signUp'] = async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    return { error: error?.message ?? null };
  };

  const signIn: AuthState['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword: AuthState['resetPassword'] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, signUp, signIn, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
