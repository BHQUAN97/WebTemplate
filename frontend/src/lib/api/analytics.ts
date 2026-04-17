/**
 * Analytics API — typed client cho admin dashboard charts.
 * Backend endpoints: xem `backend/src/modules/analytics/analytics.controller.ts`.
 * Mot so endpoint (overview/top-products/by-status) chua co o BE — fallback mock
 * voi comment TODO de de thay khi BE san sang.
 */
import { apiClient } from './client';

export interface AnalyticsRange {
  from?: string;
  to?: string;
}

export type Granularity = 'day' | 'week' | 'month';
export type OrderStatusKey =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'cancelled';

export interface OverviewStats {
  revenue: number;
  revenueDelta: number; // % thay doi so voi ky truoc
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
 * Tong quan 4 stat card.
 * TODO: Replace with real API — BE chua co /analytics/overview gop stats.
 * Tam thoi goi /analytics/dashboard va fill cac delta = 0.
 */
export async function getAnalyticsOverview(
  from?: string,
  to?: string,
): Promise<OverviewStats> {
  try {
    const raw = await apiClient.get<unknown>(
      '/analytics/dashboard',
      buildParams({ from, to }),
    );
    const data = unwrap<{
      pageviews?: number;
      unique_sessions?: number;
      events?: number;
    }>(raw);
    // BE hien tai khong tra revenue/conversion — cho nay dung proxy tam.
    return {
      revenue: 0,
      revenueDelta: 0,
      orders: data?.events ?? 0,
      ordersDelta: 0,
      newCustomers: data?.unique_sessions ?? 0,
      customersDelta: 0,
      conversionRate: 0,
      conversionDelta: 0,
    };
  } catch {
    // Mock fallback khi BE chua ready
    return {
      revenue: 125_400_000,
      revenueDelta: 12.5,
      orders: 342,
      ordersDelta: 8.3,
      newCustomers: 128,
      customersDelta: -2.1,
      conversionRate: 3.4,
      conversionDelta: 0.6,
    };
  }
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
 * Don hang theo trang thai.
 * TODO: Replace with real API — BE chua co /analytics/by-status hay /orders/stats.
 * Fallback: tra mock cho UI render duoc.
 */
export async function getOrdersByStatus(
  _from?: string,
  _to?: string,
): Promise<StatusSlice[]> {
  // TODO: Replace with real API
  return [
    { status: 'pending', count: 42 },
    { status: 'processing', count: 78 },
    { status: 'completed', count: 185 },
    { status: 'cancelled', count: 37 },
  ];
}

/**
 * Top san pham ban chay.
 * TODO: Replace with real API — BE co /reports/products (xlsx) nhung khong co JSON endpoint.
 */
export async function getTopProducts(
  _from?: string,
  _to?: string,
  limit = 5,
): Promise<TopProduct[]> {
  // TODO: Replace with real API
  const mock: TopProduct[] = [
    { name: 'Ao thun basic', sold: 240, revenue: 48_000_000 },
    { name: 'Quan jeans slim', sold: 180, revenue: 72_000_000 },
    { name: 'Giay sneaker', sold: 150, revenue: 90_000_000 },
    { name: 'Tui xach canvas', sold: 120, revenue: 36_000_000 },
    { name: 'Mu luoi trai', sold: 95, revenue: 14_250_000 },
    { name: 'Ao khoac bomber', sold: 80, revenue: 48_000_000 },
  ];
  return mock.slice(0, limit);
}

/**
 * Traffic sources theo ngay (stacked area).
 * BE co /analytics/sources nhung tra dang aggregated (referer, count).
 * Chung ta aggregate + fake trend theo ngay khi BE chua ho tro time-series.
 */
export async function getTrafficSources(
  from?: string,
  to?: string,
): Promise<TrafficPoint[]> {
  try {
    const raw = await apiClient.get<unknown>(
      '/analytics/sources',
      buildParams({ from, to }),
    );
    const data = unwrap<Array<{ source: string; count: number | string }>>(raw);
    if (!Array.isArray(data) || data.length === 0) return [];
    // Quy doi referer -> 4 nhom co dinh — BE chua co breakdown theo ngay.
    // TODO: Replace with real API khi BE ho tro time-series breakdown.
    return [];
  } catch {
    // TODO: Replace with real API
    const today = new Date();
    return Array.from({ length: 14 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (13 - i));
      const date = d.toISOString().slice(0, 10);
      return {
        date,
        organic: 200 + Math.round(Math.random() * 120),
        direct: 120 + Math.round(Math.random() * 80),
        referral: 60 + Math.round(Math.random() * 50),
        social: 40 + Math.round(Math.random() * 60),
      };
    });
  }
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
