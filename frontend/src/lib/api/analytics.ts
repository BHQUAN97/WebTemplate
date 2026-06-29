/**
 * Analytics API — typed client cho admin dashboard charts.
 * Backend endpoints: xem `backend/src/modules/analytics/analytics.controller.ts`.
 */
import { apiClient } from './client';

export interface AnalyticsRange {
  from?: string;
  to?: string;
}

export type Granularity = 'day' | 'week' | 'month';
export type Period = '7d' | '30d' | '90d';
export type OrderStatusKey =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'cancelled';

export interface OverviewStats {
  revenue: number;
  revenueDelta: number; // % thay doi so voi ky truoc (placeholder = 0)
  orders: number;
  ordersDelta: number;
  newCustomers: number;
  customersDelta: number;
  conversionRate: number; // %
  conversionDelta: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface StatusSlice {
  status: OrderStatusKey | string;
  count: number;
  percentage?: number;
}

export interface TopProduct {
  id?: string;
  name: string;
  sold: number;
  revenue: number;
}

export interface TrafficPoint {
  date: string;
  organic: number;
  direct: number;
  referral: number;
  social: number;
}

export interface CustomerPoint {
  date: string;
  newCustomers: number;
  returningCustomers: number;
}

export interface ConversionStep {
  step: 'view' | 'cart' | 'checkout' | 'paid';
  count: number;
}

export interface RevenueBreakdownItem {
  category: string;
  revenue: number;
  percentage: number;
}

/** BE wrap response voi `{ data, message }` — unwrap an toan. */
function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as any)) {
    return (res as { data: T }).data;
  }
  return res as T;
}

function buildParams(range: AnalyticsRange, extra?: Record<string, unknown>) {
  const p: Record<string, string | number | boolean | undefined> = {};
  if (range.from) p.date_from = range.from;
  if (range.to) p.date_to = range.to;
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== null) p[k] = v as string | number | boolean;
    }
  }
  return p;
}

/**
 * Tong quan 4 stat card: doanh thu, don hang, khach moi, conversion.
 * Goi /analytics/overview?period=30d — tra du lieu thuc tu DB.
 * Delta = 0 (chua co so sanh ky truoc).
 */
export async function getAnalyticsOverview(
  period: Period = '30d',
): Promise<OverviewStats> {
  const raw = await apiClient.get<unknown>('/analytics/overview', { period });
  const data = unwrap<{
    revenue: number;
    orders: number;
    newCustomers: number;
    conversionRate: number;
  }>(raw);
  return {
    revenue: data?.revenue ?? 0,
    revenueDelta: 0,
    orders: data?.orders ?? 0,
    ordersDelta: 0,
    newCustomers: data?.newCustomers ?? 0,
    customersDelta: 0,
    conversionRate: data?.conversionRate ?? 0,
    conversionDelta: 0,
  };
}

/**
 * Doanh thu theo ngay/tuan/thang.
 */
export async function getRevenueTrend(
  from?: string,
  to?: string,
  granularity: Granularity = 'day',
): Promise<RevenuePoint[]> {
  try {
    const raw = await apiClient.get<unknown>(
      '/analytics/revenue',
      buildParams({ from, to }, { group_by: granularity }),
    );
    const data = unwrap<
      Array<{ period: string; revenue: number | string; orders: number | string }>
    >(raw);
    if (!Array.isArray(data)) return [];
    return data.map((r) => ({
      date: r.period,
      revenue: Number(r.revenue) || 0,
      orders: Number(r.orders) || 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Don hang theo trang thai — goi /analytics/orders-by-status.
 * Backend tra ve [{ status, count, percentage }].
 */
export async function getOrdersByStatus(
  from?: string,
  to?: string,
): Promise<StatusSlice[]> {
  const raw = await apiClient.get<unknown>(
    '/analytics/orders-by-status',
    buildParams({ from, to }),
  );
  const data = unwrap<StatusSlice[]>(raw);
  return Array.isArray(data) ? data : [];
}

/**
 * Top san pham ban chay — goi /analytics/top-products.
 * BE tra ve [{ productId, name, slug, image, soldQty, revenue, orderCount }].
 * Map ve shape cua TopProduct.
 */
export async function getTopProducts(
  from?: string,
  to?: string,
  limit = 5,
): Promise<TopProduct[]> {
  const raw = await apiClient.get<unknown>(
    '/analytics/top-products',
    buildParams({ from, to }, { limit }),
  );
  const data = unwrap<
    Array<{
      productId?: string;
      id?: string;
      name: string;
      soldQty?: number | string;
      sold?: number;
      revenue: number | string;
    }>
  >(raw);
  if (!Array.isArray(data)) return [];
  return data.map((r) => ({
    id: r.productId ?? r.id,
    name: r.name ?? '',
    sold: Number(r.soldQty ?? r.sold) || 0,
    revenue: Number(r.revenue) || 0,
  }));
}

/**
 * Traffic sources theo ngay (stacked area) — goi /analytics/traffic-sources.
 * BE phan loai referer thanh organic/direct/social/referral.
 * period: '7d' | '30d' | '90d'
 */
export async function getTrafficSources(
  period: Period = '30d',
): Promise<TrafficPoint[]> {
  const raw = await apiClient.get<unknown>('/analytics/traffic-sources', {
    period,
  });
  const data = unwrap<TrafficPoint[]>(raw);
  return Array.isArray(data) ? data : [];
}

/**
 * Khach hang moi vs quay lai theo ngay.
 * period: '7d' | '30d' | '90d'
 */
export async function getCustomersTimeSeries(
  period: Period = '30d',
): Promise<CustomerPoint[]> {
  const raw = await apiClient.get<unknown>('/analytics/customers', { period });
  const data = unwrap<CustomerPoint[]>(raw);
  return Array.isArray(data) ? data : [];
}

/**
 * Funnel chuyen doi: view → gio hang → checkout → thanh toan.
 * period: '7d' | '30d' | '90d'
 */
export async function getConversionFunnel(
  period: Period = '30d',
): Promise<ConversionStep[]> {
  const raw = await apiClient.get<unknown>('/analytics/conversion', { period });
  const data = unwrap<ConversionStep[]>(raw);
  return Array.isArray(data) ? data : [];
}

/**
 * Doanh thu phan theo danh muc san pham.
 * period: '7d' | '30d' | '90d'
 */
export async function getRevenueBreakdown(
  period: Period = '30d',
): Promise<RevenueBreakdownItem[]> {
  const raw = await apiClient.get<unknown>('/analytics/revenue-breakdown', {
    period,
  });
  const data = unwrap<RevenueBreakdownItem[]>(raw);
  return Array.isArray(data) ? data : [];
}

/**
 * Client-side CSV export cho overview + revenue trend.
 * Neu BE cung cap endpoint export thuc, replace voi apiClient.get + blob.
 */
export function buildAnalyticsCsv(rows: RevenuePoint[]): string {
  const header = 'date,revenue,orders';
  const lines = rows.map((r) => `${r.date},${r.revenue},${r.orders}`);
  return [header, ...lines].join('\n');
}
