import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '@/features/auth/AdminAuthContext';

export default function AdminLoginPage() {
  const { session, isSuperAdmin, loading, signIn } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session && !loading && isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) setError(error);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck size={20} className="text-accent-primary" />
          <h1 className="text-lg font-semibold text-text-primary">Codex Super Admin</h1>
        </div>
        <p className="mb-6 text-sm text-text-secondary">
          Restricted access. Sign-in attempts are audit logged.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary outline-none focus:border-accent-primary"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary outline-none focus:border-accent-primary"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          {session && isSuperAdmin === false && (
            <p className="text-sm text-danger">
              This account does not have Super Admin privileges.
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-accent-primary py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-xs text-text-secondary">
          MFA enforcement and login rate limiting should be configured at the Supabase Auth project level for this
          application before handling real admin traffic.
        </p>
      </div>
    </div>
  );
}
