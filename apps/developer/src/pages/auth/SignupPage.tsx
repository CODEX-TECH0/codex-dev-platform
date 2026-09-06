import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { CodexLogo } from '@/components/CodexLogo';

export default function SignupPage() {
  const { session, signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (session) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await signUp(email, password, fullName);
    setSubmitting(false);
    if (error) setError(error);
    else setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 text-center">
          <h1 className="mb-2 text-lg font-semibold text-text-primary">Check your email</h1>
          <p className="text-sm text-text-secondary">
            We sent a verification link to <span className="text-text-primary">{email}</span>. Confirm it to
            activate your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        <Link to="/" className="mb-6 inline-flex">
          <CodexLogo size={30} />
        </Link>
        <h1 className="mb-1 text-xl font-semibold text-text-primary">Create your Codex account</h1>
        <p className="mb-6 text-sm text-text-secondary">Free public beta — no payment required</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm text-text-secondary">
              Full name
            </label>
            <input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary outline-none focus:border-accent-primary"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-text-secondary">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary outline-none focus:border-accent-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-text-secondary">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary outline-none focus:border-accent-primary"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-accent-primary py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-accent-secondary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
