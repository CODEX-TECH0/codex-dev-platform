import { Navigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  Braces,
  Binary,
  Fingerprint,
  Hash as HashIcon,
  Clock,
  Link2,
  Regex,
  FileDiff,
  ShieldCheck,
  Webhook,
  BarChart3,
  BookOpen,
  KeyRound,
  Terminal,
  Lock,
  Zap
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { CodexLogo } from '@/components/CodexLogo';
import { BackgroundMotion } from '@/components/BackgroundMotion';

const TOOLS = [
  { icon: Braces, label: 'JSON format, validate, minify' },
  { icon: Binary, label: 'Base64 encode / decode' },
  { icon: Fingerprint, label: 'UUID generation' },
  { icon: HashIcon, label: 'Hashing (SHA-256/384/512)' },
  { icon: Clock, label: 'Unix timestamp conversion' },
  { icon: Link2, label: 'URL encode / decode / parse' },
  { icon: Regex, label: 'Regex testing' },
  { icon: FileDiff, label: 'Text diff' }
];

const CAPABILITIES = [
  {
    icon: KeyRound,
    title: 'Scoped API keys',
    body: 'Test and live keys per project, with real scope enforcement, rotation, and one-time secret reveal — never stored in plaintext.'
  },
  {
    icon: ShieldCheck,
    title: 'OTP infrastructure',
    body: 'Drop-in email OTP with hashed codes, attempt limits, and expiry — built for your own login and verification flows, not just ours.'
  },
  {
    icon: Webhook,
    title: 'Signed webhooks',
    body: 'HMAC-SHA256 signed deliveries for real account events, with a one-click test delivery and a full delivery log.'
  },
  {
    icon: BarChart3,
    title: 'Real usage analytics',
    body: 'Every chart reads from your actual request history — no fabricated data, ever. Empty until you send your first request.'
  },
  {
    icon: Terminal,
    title: 'API Explorer',
    body: 'Pick an endpoint, paste a key, send a real request, and see the exact status code, timing, and response.'
  },
  {
    icon: Lock,
    title: 'Isolated by design',
    body: 'Every table enforces row-level security — a project can never see another organization\'s keys, logs, or usage, even by ID guessing.'
  }
];

export default function LandingPage() {
  const { session, loading } = useAuth();

  if (!loading && session) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <CodexLogo size={28} />
          <nav className="hidden items-center gap-6 text-sm text-text-secondary md:flex">
            <a href="#capabilities" className="hover:text-text-primary">Platform</a>
            <a href="#tools" className="hover:text-text-primary">Tools</a>
            <a href="#security" className="hover:text-text-primary">Security</a>
            <Link to="/status" className="hover:text-text-primary">Status</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth/login" className="text-sm text-text-secondary hover:text-text-primary">
              Sign in
            </Link>
            <Link
              to="/auth/signup"
              className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <BackgroundMotion />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center md:py-32">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-secondary">
            <Zap size={12} className="text-accent-secondary" />
            Public beta &middot; free, no payment method required
          </span>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Developer infrastructure,
            <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
              {' '}without the setup tax
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-text-secondary md:text-lg">
            Codex bundles the utility APIs, OTP verification, and webhook infrastructure most products end up
            building twice — with real scopes, real rate limits, and real request logs from day one.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/auth/signup"
              className="flex items-center gap-2 rounded-md bg-accent-primary px-6 py-3 text-sm font-medium text-white hover:opacity-90"
            >
              Start building free <ArrowRight size={16} />
            </Link>
            <Link
              to="/auth/login"
              className="rounded-md border border-border px-6 py-3 text-sm font-medium text-text-primary hover:border-accent-primary"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-5 font-mono text-xs text-text-secondary">
            curl https://your-project.functions.supabase.co/functions/v1/uuid-generate \<br />
            &nbsp;&nbsp;-H &quot;Authorization: Bearer cx_test_...&quot;
          </p>
        </div>
      </section>

      {/* Architecture strip */}
      <section className="border-b border-border bg-surface/40 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs uppercase tracking-wide text-text-secondary">
            Built on Supabase — Postgres, Auth, Edge Functions, and Row Level Security. No hidden backend.
          </p>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-2xl font-bold md:text-3xl">Everything wired together, not bolted on</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-text-secondary">
          One project, one set of keys, one place to see what's actually happening.
        </p>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-surface p-5 transition hover:border-accent-primary/50">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/10">
                <Icon size={18} className="text-accent-primary" />
              </div>
              <h3 className="mb-1.5 font-medium text-text-primary">{title}</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tools grid */}
      <section id="tools" className="border-y border-border bg-surface/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold md:text-3xl">Ten tools, zero setup</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-text-secondary">
            The Developer Tools Hub runs entirely in your browser — nothing you paste into it ever leaves the tab.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border border-border bg-bg px-4 py-3.5">
                <Icon size={16} className="shrink-0 text-accent-secondary" />
                <span className="text-sm text-text-primary">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Secure by construction, not by promise</h2>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              API key secrets and OTP codes are hashed and shown exactly once. Webhook signing secrets are
              encrypted, never exposed. Every table is protected by PostgreSQL Row Level Security, so a
              project can't see another organization's data — even by guessing an ID. Nothing here is a
              policy document; it's the actual database schema.
            </p>
            <Link to="/docs/security" className="mt-5 inline-flex items-center gap-1.5 text-sm text-accent-primary hover:underline">
              Read the security docs <ArrowRight size={14} />
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6 font-mono text-xs leading-relaxed text-text-secondary">
            <p><span className="text-accent-secondary">$</span> POST /v1/otp/verify</p>
            <p className="mt-2">Authorization: Bearer cx_live_••••••••••••</p>
            <p className="mt-4 text-success">{'{'}</p>
            <p className="pl-4">&quot;success&quot;: true,</p>
            <p className="pl-4">&quot;data&quot;: {'{ "verified": true }'},</p>
            <p className="pl-4">&quot;request_id&quot;: &quot;req_8f2a91c3&quot;</p>
            <p className="text-success">{'}'}</p>
          </div>
        </div>
      </section>

      {/* Docs teaser */}
      <section className="border-t border-border bg-surface/40 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <BookOpen size={28} className="mx-auto mb-4 text-accent-primary" />
          <h2 className="text-2xl font-bold md:text-3xl">Documentation that matches the code</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">
            Every endpoint documented reflects what's actually deployed — nothing planned, nothing deprecated
            left lingering.
          </p>
          <Link
            to="/auth/signup"
            className="mt-7 inline-flex items-center gap-2 rounded-md bg-accent-primary px-6 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Create a free account <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row">
          <CodexLogo size={22} />
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-text-secondary">
            <Link to="/docs" className="hover:text-text-primary">Documentation</Link>
            <Link to="/changelog" className="hover:text-text-primary">Changelog</Link>
            <Link to="/status" className="hover:text-text-primary">Status</Link>
            <Link to="/auth/login" className="hover:text-text-primary">Sign in</Link>
            <Link to="/auth/signup" className="hover:text-text-primary">Sign up</Link>
          </nav>
          <p className="text-xs text-text-secondary">Codex Tech Foundation</p>
        </div>
      </footer>
    </div>
  );
}
