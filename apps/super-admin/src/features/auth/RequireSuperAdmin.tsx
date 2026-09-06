import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext';
import { supabase } from '@/lib/supabase';

export function RequireSuperAdmin() {
  const { session, isSuperAdmin, loading } = useAdminAuth();
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
      setNeedsMfa(!!data && data.currentLevel !== data.nextLevel);
      setAalChecked(true);
    });
  }, [session]);

  if (loading || !aalChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg text-text-secondary">
        Verifying access…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin-login" replace state={{ from: location.pathname }} />;
  }

  if (needsMfa) {
    return <Navigate to="/admin-mfa-challenge" replace state={{ from: location.pathname }} />;
  }

  if (isSuperAdmin === false) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-bg px-4 text-center">
        <p className="text-lg font-medium text-text-primary">Access denied</p>
        <p className="max-w-sm text-sm text-text-secondary">
          Your account is signed in but does not have Super Admin privileges. Contact an existing admin if you
          believe this is a mistake.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
