/**
 * Chart theme helpers — palette tuong thich dark mode (CSS vars trong globals.css)
 * va cac formatter dung cho recharts tooltip/axis.
 */

/**
 * Palette chinh — 8 mau dung CSS variables.
 * Cac mau hsl(var(--primary))... tu dong swap khi toggle dark mode.
 * PIE/BAR co the xoay vong trong array nay.
 */
export const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(217 91% 60%)', // blue-500 — accent 1
  'hsl(271 81% 56%)', // purple-500 — accent 2
  'hsl(173 80% 40%)', // teal-600 — accent 3
  'hsl(24 95% 53%)', // orange-500 — accent 4
] as const;

/**
 * Palette cho order status — mapping co dinh de mau nhat quan.
 */
export const STATUS_COLORS: Record<string, string> = {
  pending: 'hsl(var(--warning))',
  processing: 'hsl(217 91% 60%)',
  completed: 'hsl(var(--success))',
  cancelled: 'hsl(var(--destructive))',
  shipped: 'hsl(271 81% 56%)',
  delivered: 'hsl(142 70% 40%)',
  refunded: 'hsl(24 95% 53%)',
};

/**
 * Mau cho cac nguon traffic — de dung chung giua chart va legend.
 */
export const TRAFFIC_COLORS: Record<string, string> = {
  organic: 'hsl(var(--success))',
  direct: 'hsl(var(--primary))',
  referral: 'hsl(271 81% 56%)',
  social: 'hsl(24 95% 53%)',
};

/**
 * Grid/axis stroke — dung token --border de theme-aware.
 */
export const CHART_GRID_STROKE = 'hsl(var(--border))';
export const CHART_AXIS_STROKE = 'hsl(var(--muted-foreground))';

/**
 * Format tien VND cho tooltip/axis.
 * Khong hien ky hieu don vi neu `compact` = true (rut gon axis).
 */
export function formatCurrency(value: number, compact = false): string {
  if (!Number.isFinite(value)) return '0 VND';
  if (compact) {
    if (Math.abs(value) >= 1_000_000_000)
      return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' ty';
    if (Math.abs(value) >= 1_000_000)
      return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' tr';
    if (Math.abs(value) >= 1_000)
      return (value / 1_000).toFixed(0) + 'k';
    return value.toLocaleString('vi-VN');
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format so co hau to k/M — dung cho axis, stat card.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(value);
}

/**
 * Format phan tram — luon co dau.
 */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return (value >= 0 ? '+' : '') + value.toFixed(1) + '%';
}

/**
 * Lay mau theo index, xoay vong.
 */
export function colorAt(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
