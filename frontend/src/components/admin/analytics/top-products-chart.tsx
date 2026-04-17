'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CHART_AXIS_STROKE,
  CHART_GRID_STROKE,
  colorAt,
  formatCurrency,
  formatNumber,
} from '@/lib/utils/chart-theme';
import type { TopProduct } from '@/lib/api/analytics';

interface TopProductsChartProps {
  data: TopProduct[];
  loading?: boolean;
  height?: number;
  /** Hien theo doanh thu hay so luong ban — mac dinh 'sold' */
  metric?: 'sold' | 'revenue';
}

/**
 * Horizontal BarChart — top san pham.
 */
export function TopProductsChart({
  data,
  loading = false,
  height = 280,
  metric = 'sold',
}: TopProductsChartProps) {
  if (loading) {
    return <Skeleton className="w-full rounded-xl" style={{ height }} />;
  }

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        Chua co du lieu san pham
      </div>
    );
  }

  const label = metric === 'revenue' ? 'Doanh thu' : 'So luong ban';
  const fmt = (v: number) =>
    metric === 'revenue' ? formatCurrency(v, true) : formatNumber(v);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
          <XAxis
            type="number"
            stroke={CHART_AXIS_STROKE}
            fontSize={12}
            tickFormatter={fmt}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke={CHART_AXIS_STROKE}
            fontSize={12}
            width={120}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: `1px solid hsl(var(--border))`,
              borderRadius: 8,
              color: 'hsl(var(--popover-foreground))',
              fontSize: 12,
            }}
            formatter={(value) => {
              const n = Number(value) || 0;
              return [
                metric === 'revenue'
                  ? formatCurrency(n)
                  : n.toLocaleString('vi-VN'),
                label,
              ];
            }}
          />
          <Bar dataKey={metric} radius={[0, 6, 6, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={colorAt(i)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
