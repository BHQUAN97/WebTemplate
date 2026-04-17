import { apiClient } from '../client';

export type ReportType =
  | 'sales'
  | 'inventory'
  | 'customers'
  | 'products'
  | 'traffic';

export type ReportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

export interface ReportDateRange {
  startDate?: string;
  endDate?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportPreview<T = Record<string, unknown>> {
  headers: string[];
  rows: T[];
  totalRows: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token =
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const reportsApi = {
  /**
   * Tai report duoi dang blob — dung cho CSV/XLSX/PDF download.
   */
  async download(
    type: ReportType,
    params: {
      dateFrom?: string;
      dateTo?: string;
      format: Exclude<ReportFormat, 'json'>;
    },
  ): Promise<Blob> {
    const qs = buildQuery({
      format: params.format,
      date_from: params.dateFrom,
      date_to: params.dateTo,
    });
    const res = await fetch(`${API_BASE_URL}/reports/${type}${qs}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: 'Khong the tao bao cao' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.blob();
  },

  /**
   * Preview report duoi dang JSON — de render bang tren UI.
   */
  preview<T = Record<string, unknown>>(
    type: ReportType,
    params: { dateFrom?: string; dateTo?: string },
  ) {
    return apiClient.get<ReportPreview<T>>(`/reports/${type}`, {
      format: 'json',
      date_from: params.dateFrom,
      date_to: params.dateTo,
    });
  },

  // Legacy methods for backward compat
  async generateReport(
    type: ReportType,
    dateRange: { startDate: string; endDate: string },
    format: 'csv' | 'xlsx' | 'pdf',
  ): Promise<string> {
    const blob = await this.download(type, {
      dateFrom: dateRange.startDate,
      dateTo: dateRange.endDate,
      format,
    });
    return URL.createObjectURL(blob);
  },

  getReportPreview(
    type: ReportType,
    dateRange: { startDate: string; endDate: string },
  ) {
    return apiClient.get<ReportPreview>('/reports/preview', {
      type,
      ...dateRange,
    });
  },
};
