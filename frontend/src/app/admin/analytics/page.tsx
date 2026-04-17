'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  DollarSign,
  ShoppingCart,
  UserPlus,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatsGridSkeleton } from '@/components/shared/skeletons';
import { DateRangePicker } from '@/components/shared/date-range-picker';
import {
  ExportButton,
  type ExportFormat,
} from '@/components/shared/export-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  getAnalyticsOverview,
  getRevenueTrend,
  getOrdersByStatus,
  getTopProducts,
  getTrafficSources,
  buildAnalyticsCsv,
  type OverviewStats,
  type RevenuePoint,
  type StatusSlice,
  type TopProduct,
  type TrafficPoint,
} from '@/lib/api/analytics';
import { formatCurrency, formatNumber } from '@/lib/utils/chart-theme';

// Recharts chi chay client — dynamic import de giam SSR bundle + tranh hydration mismatch
const RevenueChart = dynamic(
  () => import('@/components/admin/analytics/revenue-chart').then((m) => m.RevenueChart),
  { ssr: false },
);
const OrdersStatusChart = dynamic(
  () =>
    import('@/components/admin/analytics/orders-status-chart').then(
      (m) => m.OrdersStatusChart,
    ),
  { ssr: false },
);
const TopProductsChart = dynamic(
  () =>
    import('@/components/admin/analytics/top-products-chart').then(
      (m) => m.TopProductsChart,
    ),
  { ssr: false },
);
const TrafficChart = dynamic(
  () =>
    import('@/components/admin/analytics/traffic-chart').then((m) => m.TrafficChart),
  { ssr: false },
);

/**
 * Mac dinh: 30 ngay gan nhat. Tinh toan client-side sau khi mount de tranh
 * hydration mismatch (server va client co the khac timestamp).
 */
function computeDefaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

/** Trang phan tich nang cao cho admin — stats + 4 bieu do recharts. */
export default function AnalyticsPage() {
  // Khoi tao null tren SSR → client hydrate → useEffect set range → load data.
  // Tranh new Date() chay o render path gay hydration mismatch.
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [statuses, setStatuses] = useState<StatusSlice[]>([]);
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [traffic, setTraffic] = useState<TrafficPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Init range client-side only
  useEffect(() => {
    setRange(computeDefaultRange());
  }, []);

  const loadAll = useCallback(async () => {
    if (!range) return;
    setLoading(true);
    try {
      const [o, r, s, p, t] = await Promise.all([
        getAnalyticsOverview(range.from, range.to),
        getRevenueTrend(range.from, range.to, 'day'),
        getOrdersByStatus(range.from, range.to),
        getTopProducts(range.from, range.to, 5),
        getTrafficSources(range.from, range.to),
      ]);
      setOverview(o);
      setRevenue(r);
      setStatuses(s);
      setProducts(p);
      setTraffic(t);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (range) loadAll();
  }, [loadAll, range]);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (format !== 'csv' || !range) return; // chi ho tro CSV client-side
      const csv = buildAnalyticsCsv(revenue);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${range.from}-to-${range.to}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [revenue, range],
  );

  const topProductsFallback = useMemo(
    () =>
      products.length === 0 ? (
        <div className="text-sm text-muted-foreground">Chua co du lieu</div>
      ) : null,
    [products],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phan tich nang cao"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Analytics' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {range && <DateRangePicker value={range} onChange={setRange} />}
            <Button
              variant="outline"
              size="icon"
              onClick={loadAll}
              disabled={loading || !range}
              aria-label="Lam moi"
            >
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </Button>
            <ExportButton onExport={handleExport} formats={['csv']} />
          </div>
        }
      />

      {/* A. Top stats grid */}
      {loading || !overview ? (
        <StatsGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<DollarSign className="h-6 w-6" />}
            label="Tong doanh thu"
            value={formatCurrency(overview.revenue)}
            trend={overview.revenueDelta}
            trendLabel="So voi ky truoc"
          />
          <StatCard
            icon={<ShoppingCart className="h-6 w-6" />}
            label="Don hang moi"
            value={formatNumber(overview.orders)}
            trend={overview.ordersDelta}
            trendLabel="So voi ky truoc"
          />
          <StatCard
            icon={<UserPlus className="h-6 w-6" />}
            label="Khach hang moi"
            value={formatNumber(overview.newCustomers)}
            trend={overview.customersDelta}
            trendLabel="So voi ky truoc"
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6" />}
            label="Ty le chuyen doi"
            value={`${overview.conversionRate.toFixed(2)}%`}
            trend={overview.conversionDelta}
            trendLabel="So voi ky truoc"
          />
        </div>
      )}

      {/* B. Revenue trend */}
      <Card>
        <CardHeader>
          <CardTitle>Doanh thu 30 ngay</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={revenue} loading={loading} />
        </CardContent>
      </Card>

      {/* C. Orders status (Pie) + Top products (Bar) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Don hang theo trang thai</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersStatusChart data={statuses} loading={loading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 san pham ban chay</CardTitle>
          </CardHeader>
          <CardContent>
            {topProductsFallback ?? (
              <TopProductsChart data={products} loading={loading} metric="sold" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* D. Traffic sources */}
      <Card>
        <CardHeader>
          <CardTitle>Nguon truy cap</CardTitle>
        </CardHeader>
        <CardContent>
          {traffic.length === 0 && !loading ? (
            <ul className="space-y-2 text-sm">
              {['organic', 'direct', 'referral', 'social'].map((s) => (
                <li
                  key={s}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="capitalize">{s}</span>
                  <span className="text-muted-foreground">—</span>
                </li>
              ))}
            </ul>
          ) : (
            <TrafficChart data={traffic} loading={loading} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
