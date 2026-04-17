import { apiClient } from '../client';
import type { DashboardStats } from '@/lib/types';

export interface AnalyticsDateRange {
  startDate: string;
  endDate: string;
}

export interface PageviewData {
  date: string;
  views: number;
  uniqueVisitors: number;
}

export interface TopPageData {
  path: string;
  views: number;
  avgTime: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

export interface DeviceData {
  device: string;
  count: number;
  percentage: number;
}

export interface SourceData {
  source: string;
  visits: number;
  percentage: number;
}

export const analyticsApi = {
  getDashboard() {
    return apiClient.get<DashboardStats>('/analytics/dashboard');
  },

  getPageviews(range: AnalyticsDateRange) {
    return apiClient.get<PageviewData[]>('/analytics/pageviews', range as unknown as Record<string, string>);
  },

  getTopPages(range: AnalyticsDateRange) {
    return apiClient.get<TopPageData[]>('/analytics/top-pages', range as unknown as Record<string, string>);
  },

  getRevenue(range: AnalyticsDateRange) {
    return apiClient.get<RevenueData[]>('/analytics/revenue', range as unknown as Record<string, string>);
  },

  getDevices(range: AnalyticsDateRange) {
    return apiClient.get<DeviceData[]>('/analytics/devices', range as unknown as Record<string, string>);
  },

  getSources(range: AnalyticsDateRange) {
    return apiClient.get<SourceData[]>('/analytics/sources', range as unknown as Record<string, string>);
  },
};
