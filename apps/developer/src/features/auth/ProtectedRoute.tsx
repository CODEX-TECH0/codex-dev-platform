import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [aalChecked, setAalChecked] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);

  useEffect(() => {
    if (!session) {
      setAalChecked(true);
      return;
    }
    setAalChecked(false);
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      // currentLevel !== nextLevel means the account has a verified factor
      // enrolled but this session hasn't completed the second-factor
      // challenge yet — real AAL2 enforcement, not just enrollment support.
      setNeedsMfa(!!data && data.currentLevel !== data.nextLevel);
      setAalChecked(true);
    });
  }, [session]);

  if (loading || !aalChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg text-text-secondary">
        Loading your session…
      </div>
    );
  }

  if (!session) {
    // Preserves where the visitor was headed (e.g. a docs link from the
    // public landing page) so LoginPage's `location.state?.from` lookup —
    // which already existed but had nothing setting it — actually round-trips
    // them back to their original destination after signing in.
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  if (needsMfa) {
    return <Navigate to="/auth/mfa-challenge" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
