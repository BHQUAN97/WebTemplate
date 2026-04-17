'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CHART_AXIS_STROKE,
  CHART_GRID_STROKE,
  TRAFFIC_COLORS,
  formatNumber,
} from '@/lib/utils/chart-theme';
import type { TrafficPoint } from '@/lib/api/analytics';

interface TrafficChartProps {
  data: TrafficPoint[];
  loading?: boolean;
  height?: number;
}

const LEGEND: Record<string, string> = {
  organic: 'Tu khoa (Organic)',
  direct: 'Truc tiep',
  referral: 'Gioi thieu',
  social: 'Mang xa hoi',
};

/**
 * Stacked AreaChart — 4 nguon traffic theo ngay.
 * Fallback: neu data rong hien empty state, parent co the show list thay the.
 */
export function TrafficChart({
  data,
  loading = false,
  height = 320,
}: TrafficChartProps) {
  if (loading) {
    return <Skeleton className="w-full rounded-xl" style={{ height }} />;
  }

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        Chua co du lieu nguon truy cap
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <defs>
            {(['organic', 'direct', 'referral', 'social'] as const).map((k) => (
              <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TRAFFIC_COLORS[k]} stopOpacity={0.6} />
                <stop offset="100%" stopColor={TRAFFIC_COLORS[k]} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
          <XAxis
            dataKey="date"
            stroke={CHART_AXIS_STROKE}
            fontSize={12}
            tickMargin={8}
          />
          <YAxis
            stroke={CHART_AXIS_STROKE}
            fontSize={12}
            tickFormatter={formatNumber}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: `1px solid hsl(var(--border))`,
              borderRadius: 8,
              color: 'hsl(var(--popover-foreground))',
              fontSize: 12,
            }}
            formatter={(value, name) => {
              const n = Number(value) || 0;
              const key = String(name);
              return [n.toLocaleString('vi-VN'), LEGEND[key] ?? key];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
            formatter={(v: string) => LEGEND[v] ?? v}
          />
          {(['organic', 'direct', 'referral', 'social'] as const).map((k) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stackId="1"
              stroke={TRAFFIC_COLORS[k]}
              fill={`url(#grad-${k})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
