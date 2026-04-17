'use client';

import * as React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';

interface TrafficPoint {
  date: string;
  views: number;
  visitors: number;
}

interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

interface DeviceSlice {
  device: string;
  count: number;
  percent: number;
}

interface TopPageRow {
  path: string;
  views: number;
  uniqueViews: number;
}

interface AnalyticsChartsProps {
  traffic: TrafficPoint[];
  revenue: RevenuePoint[];
  devices: DeviceSlice[];
  topPages: TopPageRow[];
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

/**
 * Biu do phan tich dung Recharts.
 * Chi render client-side — dynamic import tu analytics page.
 */
export function AnalyticsCharts({
  traffic,
  revenue,
  devices,
  topPages,
}: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Traffic line chart */}
      <Card>
        <CardHeader>
          <CardTitle>Luong truy cap theo thoi gian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {traffic.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={traffic}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="views"
                    name="Luot xem"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="visitors"
                    name="Khach truy cap"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Chua co du lieu luong truy cap" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Revenue line chart */}
      <Card>
        <CardHeader>
          <CardTitle>Doanh thu theo thoi gian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {revenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Doanh thu"
                    stroke="#f59e0b"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    name="Don hang"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Chua co du lieu doanh thu" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top pages bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top trang co luot xem cao nhat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {topPages.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topPages.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="path"
                    width={120}
                    fontSize={11}
                  />
                  <Tooltip />
                  <Bar dataKey="views" name="Luot xem" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Chua co du lieu top trang" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Device pie chart */}
      <Card>
        <CardHeader>
          <CardTitle>Phan bo thiet bi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {devices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie
                    data={devices}
                    dataKey="count"
                    nameKey="device"
                    outerRadius={90}
                    label={(entry: unknown) => {
                      // Recharts type cho label entry la any — chuan hoa an toan
                      const e = entry as { device?: string; percent?: number };
                      return `${e.device ?? ''} ${e.percent ?? 0}%`;
                    }}
                  >
                    {devices.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Chua co du lieu thiet bi" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-gray-400">
      {text}
    </div>
  );
}
