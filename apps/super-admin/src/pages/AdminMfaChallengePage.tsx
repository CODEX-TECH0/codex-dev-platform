import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CodexLogo } from '@/components/CodexLogo';

/**
 * Enforces AAL2 for Super Admin accounts with a verified TOTP factor.
 * There's no MFA enrollment UI in this app (it's the developer app's
 * Security settings) — but MFA factors live on the underlying Supabase
 * Auth user, not per-app, so an admin who enrolled a factor via the
 * developer app is still correctly challenged here. An admin with no
 * enrolled factor is waved through immediately (currentLevel === nextLevel).
 */
export default function AdminMfaChallengePage() {
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'required' | 'satisfied' | 'no-session'>('checking');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setStatus('no-session');
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!aal || aal.currentLevel === aal.nextLevel) {
        setStatus('satisfied');
        return;
      }

      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factorsData?.totp?.find((f) => f.status === 'verified');
      if (!verifiedFactor) {
        setStatus('satisfied');
        return;
      }

      setFactorId(verifiedFactor.id);
      setStatus('required');
    })();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setVerifying(true);
    setError(null);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? 'Failed to start verification challenge.');
      setVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code
    });

    setVerifying(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    setStatus('satisfied');
  }

  if (status === 'no-session') {
    return <Navigate to="/admin-login" replace />;
  }

  if (status === 'satisfied') {
    const from = (location.state as { from?: string })?.from ?? '/admin';
    return <Navigate to={from} replace />;
  }

  if (status === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center bg-bg text-text-secondary">
        Checking your session…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        <CodexLogo size={30} className="mb-6" />
        <h1 className="mb-1 text-xl font-semibold text-text-primary">Two-factor verification</h1>
        <p className="mb-6 text-sm text-text-secondary">
          Enter the 6-digit code from your authenticator app to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            maxLength={6}
            inputMode="numeric"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-center font-mono text-lg tracking-widest text-text-primary outline-none focus:border-accent-primary"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={verifying || code.length !== 6}
            className="w-full rounded-md bg-accent-primary py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {verifying ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}
