import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';
import { SettingsTabs } from '@/components/SettingsTabs';

interface MfaFactor {
  id: string;
  factor_type: string;
  status: string;
}

export default function SecuritySettingsPage() {
  const { session } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);

  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  async function refreshFactors() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as unknown as MfaFactor[]);
  }

  useEffect(() => {
    refreshFactors();
  }, []);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      setSaved(true);
      setPassword('');
      setTimeout(() => setSaved(false), 1500);
    }
  }

  async function startEnrollment() {
    setMfaBusy(true);
    setMfaError(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    setMfaBusy(false);
    if (error) {
      setMfaError(error.message);
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolling(true);
  }

  async function confirmEnrollment(e: FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setMfaBusy(true);
    setMfaError(null);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setMfaError(challengeError?.message ?? 'Failed to start verification challenge.');
      setMfaBusy(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: verifyCode
    });
    setMfaBusy(false);
    if (verifyError) {
      setMfaError(verifyError.message);
      return;
    }
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setVerifyCode('');
    await refreshFactors();
  }

  async function handleUnenroll(id: string) {
    if (!confirm('Remove this authenticator? You will no longer be asked for a code at sign-in.')) return;
    await supabase.auth.mfa.unenroll({ factorId: id });
    await refreshFactors();
  }

  async function handleSignOutOthers() {
    await supabase.auth.signOut({ scope: 'others' });
    setSessionMessage('Signed out of all other sessions. This device stays signed in.');
  }

  async function handleSignOutEverywhere() {
    if (!confirm('Sign out of every device, including this one?')) return;
    await supabase.auth.signOut({ scope: 'global' });
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Settings</h1>
      <SettingsTabs />
      <h2 className="mb-1 text-lg font-medium text-text-primary">Security</h2>
      <p className="mb-6 text-sm text-text-secondary">Password, two-factor authentication, and sessions</p>

      <form onSubmit={handleChangePassword} className="mb-8 max-w-md space-y-4 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-medium text-text-primary">Change password</h2>
        <input
          type="password"
          minLength={8}
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white">
          {saved ? 'Updated' : 'Update password'}
        </button>
      </form>

      <div className="mb-8 max-w-md rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-medium text-text-primary">Two-factor authentication (TOTP)</h2>
        <p className="mb-3 text-xs text-text-secondary">
          Once enrolled and verified, every future sign-in will require a code from your authenticator app before
          reaching the dashboard — this is enforced, not just recorded.
        </p>

        {factors.length > 0 && (
          <div className="mb-3 space-y-2">
            {factors.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md bg-bg px-3 py-2 text-sm">
                <span className="text-text-primary">
                  Authenticator app <span className="text-text-secondary">({f.status})</span>
                </span>
                <button onClick={() => handleUnenroll(f.id)} className="text-xs text-danger hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {!enrolling && factors.length === 0 && (
          <button
            onClick={startEnrollment}
            disabled={mfaBusy}
            className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {mfaBusy ? 'Starting…' : 'Enable two-factor authentication'}
          </button>
        )}

        {enrolling && qrCode && (
          <form onSubmit={confirmEnrollment} className="space-y-3">
            <p className="text-sm text-text-secondary">
              Scan this QR code with an authenticator app (1Password, Authy, Google Authenticator), then enter the
              6-digit code it shows.
            </p>
            <img src={qrCode} alt="TOTP enrollment QR code" className="h-40 w-40 rounded-md bg-white p-2" />
            {secret && (
              <p className="font-mono text-xs text-text-secondary">
                Manual entry key: <span className="text-text-primary">{secret}</span>
              </p>
            )}
            <input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              placeholder="6-digit code"
              maxLength={6}
              className="w-32 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
            />
            {mfaError && <p className="text-sm text-danger">{mfaError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={mfaBusy || verifyCode.length !== 6}
                className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {mfaBusy ? 'Verifying…' : 'Verify and enable'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEnrolling(false);
                  setQrCode(null);
                }}
                className="rounded-md px-4 py-2 text-sm text-text-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="max-w-md rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-medium text-text-primary">Sessions</h2>
        <p className="text-sm text-text-secondary">
          Signed in as {session?.user.email}. Session expires{' '}
          {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'according to your project settings'}.
        </p>
        {sessionMessage && <p className="mt-2 text-sm text-success">{sessionMessage}</p>}
        <div className="mt-3 flex gap-3">
          <button onClick={handleSignOutOthers} className="text-sm text-accent-secondary hover:underline">
            Sign out other sessions
          </button>
          <button onClick={handleSignOutEverywhere} className="text-sm text-danger hover:underline">
            Sign out everywhere
          </button>
        </div>
      </div>
    </div>
  );
}
