import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useIsDarkMode } from '@/features/theme/ThemeContext';

interface EndpointBreakdown {
  endpoint: string;
  count: number;
}

const COLORS = ['#3B82F6', '#22D3EE', '#22C55E', '#F59E0B', '#EF4444', '#A855F7'];

const CHART_COLORS = {
  dark: { grid: '#263241', axis: '#94A3B8', tooltipBg: '#151B23', tooltipBorder: '#263241' },
  light: { grid: '#E2E8F0', axis: '#475569', tooltipBg: '#FFFFFF', tooltipBorder: '#E2E8F0' }
};

export default function AnalyticsPage() {
  const [byEndpoint, setByEndpoint] = useState<EndpointBreakdown[]>([]);
  const [byEnv, setByEnv] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const isDark = useIsDarkMode();
  const chartColors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('request_logs')
        .select('endpoint, environment')
        .gte('created_at', since);

      if (!error && data) {
        const endpointCounts = new Map<string, number>();
        const envCounts = new Map<string, number>();
        for (const row of data as { endpoint: string; environment: string }[]) {
          endpointCounts.set(row.endpoint, (endpointCounts.get(row.endpoint) ?? 0) + 1);
          envCounts.set(row.environment, (envCounts.get(row.environment) ?? 0) + 1);
        }
        setByEndpoint(
          [...endpointCounts.entries()]
            .map(([endpoint, count]) => ({ endpoint, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        );
        setByEnv([...envCounts.entries()].map(([name, value]) => ({ name, value })));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Analytics</h1>
      <p className="mb-6 text-sm text-text-secondary">Last 30 days, across your active projects</p>

      {loading ? (
        <p className="text-text-secondary">Loading…</p>
      ) : byEndpoint.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-text-secondary">
          No usage data yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-4 text-sm font-medium text-text-secondary">Top endpoints</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byEndpoint} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis type="number" stroke={chartColors.axis} fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="endpoint" stroke={chartColors.axis} fontSize={11} width={140} />
                <Tooltip contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-4 text-sm font-medium text-text-secondary">Test vs live traffic</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byEnv} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {byEnv.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
