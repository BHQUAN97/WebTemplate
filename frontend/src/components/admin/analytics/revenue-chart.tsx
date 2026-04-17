'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CHART_AXIS_STROKE,
  CHART_GRID_STROKE,
  formatCurrency,
} from '@/lib/utils/chart-theme';
import type { RevenuePoint } from '@/lib/api/analytics';

interface RevenueChartProps {
  data: RevenuePoint[];
  loading?: boolean;
  height?: number;
}

/**
 * LineChart wrapper cho revenue trend — theme-aware, tooltip VND.
 */
export function RevenueChart({
  data,
  loading = false,
  height = 320,
}: RevenueChartProps) {
  if (loading) {
    return <Skeleton className="w-full rounded-xl" style={{ height }} />;
  }

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        Chua co du lieu doanh thu cho khoang thoi gian nay
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
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
            tickFormatter={(v: number) => formatCurrency(v, true)}
            width={72}
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
              return name === 'revenue'
                ? [formatCurrency(n), 'Doanh thu']
                : [n.toLocaleString('vi-VN'), 'Don hang'];
            }}
            labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
            formatter={(v: string) => (v === 'revenue' ? 'Doanh thu' : 'Don hang')}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="orders"
            stroke="hsl(var(--success))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            yAxisId={0}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
