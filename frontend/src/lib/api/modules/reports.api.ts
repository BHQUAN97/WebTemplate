import { apiClient } from '../client';

export type ReportType = 'sales' | 'inventory' | 'customers' | 'products' | 'traffic';
export type ReportFormat = 'csv' | 'excel' | 'pdf';

export interface ReportDateRange {
  startDate: string;
  endDate: string;
}

export interface ReportPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const reportsApi = {
  /**
   * Tao va tai report — tra ve blob URL de download
   */
  async generateReport(
    type: ReportType,
    dateRange: ReportDateRange,
    format: ReportFormat,
  ): Promise<string> {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null;

    const res = await fetch(
      `${API_BASE_URL}/reports/generate?type=${type}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&format=${format}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      },
    );

    if (!res.ok) throw new Error('Khong the tao bao cao');

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  getReportPreview(type: ReportType, dateRange: ReportDateRange) {
    return apiClient.get<ReportPreview>('/reports/preview', {
      type,
      ...dateRange,
    });
  },
};
