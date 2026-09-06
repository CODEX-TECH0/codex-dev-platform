import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await resetPassword(email);
    setSubmitting(false);
    if (error) setError(error);
    else setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        <h1 className="mb-1 text-xl font-semibold text-text-primary">Reset your password</h1>
        <p className="mb-6 text-sm text-text-secondary">We'll email you a reset link.</p>

        {sent ? (
          <p className="text-sm text-success">
            If an account exists for {email}, a reset link has been sent.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary outline-none focus:border-accent-primary"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-accent-primary py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-text-secondary">
          <Link to="/auth/login" className="text-accent-secondary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
