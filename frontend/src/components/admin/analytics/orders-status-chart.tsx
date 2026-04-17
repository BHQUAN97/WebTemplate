'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { STATUS_COLORS, colorAt } from '@/lib/utils/chart-theme';
import type { StatusSlice } from '@/lib/api/analytics';

interface OrdersStatusChartProps {
  data: StatusSlice[];
  loading?: boolean;
  height?: number;
}

const LABELS: Record<string, string> = {
  pending: 'Cho xac nhan',
  processing: 'Dang xu ly',
  completed: 'Hoan thanh',
  cancelled: 'Da huy',
  shipped: 'Dang giao',
  delivered: 'Da giao',
  refunded: 'Hoan tien',
};

/**
 * PieChart wrapper — phan bo don hang theo status. Theme-aware.
 */
export function OrdersStatusChart({
  data,
  loading = false,
  height = 280,
}: OrdersStatusChartProps) {
  if (loading) {
    return <Skeleton className="w-full rounded-xl" style={{ height }} />;
  }

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        Chua co du lieu don hang
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: LABELS[d.status] || d.status,
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: `1px solid hsl(var(--border))`,
              borderRadius: 8,
              color: 'hsl(var(--popover-foreground))',
              fontSize: 12,
            }}
            formatter={(value, _name, entry) => {
              const n = Number(value) || 0;
              const label = (entry as { payload?: { label?: string } } | undefined)
                ?.payload?.label;
              return [n.toLocaleString('vi-VN'), label ?? ''];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
            formatter={(_v, entry) =>
              (entry as { payload?: { label?: string } } | undefined)?.payload
                ?.label ?? ''
            }
          />
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="label"
            outerRadius="75%"
            innerRadius="45%"
            paddingAngle={2}
          >
            {chartData.map((d, i) => (
              <Cell
                key={d.status}
                fill={STATUS_COLORS[d.status] || colorAt(i)}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
