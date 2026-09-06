import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { FolderPlus, KeyRound, Code2, BookOpen } from 'lucide-react';
import { getDashboardSummary, getDailyRequestSeries, type DashboardSummary, type DailyRequestPoint } from '@/services/analytics';
import { useIsDarkMode } from '@/features/theme/ThemeContext';

// Recharts takes hex color props directly (not CSS classes), so it can't
// pick up the .dark-class-driven CSS variables used everywhere else in the
// app — these have to be resolved explicitly per theme.
const CHART_COLORS = {
  dark: { grid: '#263241', axis: '#94A3B8', tooltipBg: '#151B23', tooltipBorder: '#263241', tooltipText: '#F8FAFC' },
  light: { grid: '#E2E8F0', axis: '#475569', tooltipBg: '#FFFFFF', tooltipBorder: '#E2E8F0', tooltipText: '#0F172A' }
};

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ?? 'text-text-primary'}`}>{value}</p>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [series, setSeries] = useState<DailyRequestPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDark = useIsDarkMode();
  const chartColors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, d] = await Promise.all([getDashboardSummary(30), getDailyRequestSeries(14)]);
        if (!cancelled) {
          setSummary(s);
          setSeries(d);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Dashboard</h1>
      <p className="mb-6 text-sm text-text-secondary">Last 30 days across all your active projects</p>

      {error && (
        <div className="mb-6 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-surface" />
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total requests" value={formatCount(summary.totalRequests)} />
            <StatCard label="Successful" value={formatCount(summary.successCount)} accent="text-success" />
            <StatCard label="Failed" value={formatCount(summary.failedCount)} accent="text-danger" />
            <StatCard label="Error rate" value={`${summary.errorRate}%`} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Active projects" value={summary.activeProjects} />
            <StatCard label="Active API keys" value={summary.activeApiKeys} />
          </div>

          <div className="mt-6 rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-4 text-sm font-medium text-text-secondary">Requests, last 14 days</h2>
            {series.every((p) => p.requests === 0) ? (
              <div className="flex h-64 flex-col items-center justify-center text-center text-text-secondary">
                <p className="text-sm">No requests yet.</p>
                <p className="mt-1 text-xs">
                  Create an API key and make your first request to see activity here.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="reqGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => d.slice(5)}
                    stroke={chartColors.axis}
                    fontSize={12}
                  />
                  <YAxis stroke={chartColors.axis} fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8 }}
                    labelStyle={{ color: chartColors.tooltipText }}
                  />
                  <Area type="monotone" dataKey="requests" stroke="#3B82F6" fill="url(#reqGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      ) : null}

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-text-secondary">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Link
            to="/projects"
            className="flex items-center gap-2 rounded-md border border-border bg-surface p-3 text-sm hover:border-accent-primary"
          >
            <FolderPlus size={16} className="text-accent-primary" /> Create Project
          </Link>
          <Link
            to="/api-keys"
            className="flex items-center gap-2 rounded-md border border-border bg-surface p-3 text-sm hover:border-accent-primary"
          >
            <KeyRound size={16} className="text-accent-primary" /> Create API Key
          </Link>
          <Link
            to="/api-explorer"
            className="flex items-center gap-2 rounded-md border border-border bg-surface p-3 text-sm hover:border-accent-primary"
          >
            <Code2 size={16} className="text-accent-primary" /> API Explorer
          </Link>
          <Link
            to="/docs"
            className="flex items-center gap-2 rounded-md border border-border bg-surface p-3 text-sm hover:border-accent-primary"
          >
            <BookOpen size={16} className="text-accent-primary" /> Documentation
          </Link>
        </div>
      </div>
    </div>
  );
}
