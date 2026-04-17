'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Eye,
  Users,
  Clock,
  ArrowDownUp,
  Monitor,
  Smartphone,
  Globe,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import {
  ExportButton,
  type ExportFormat,
} from '@/components/shared/export-button';
import { PrintButton } from '@/components/shared/print-button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/hooks/use-api';
import { formatNumber } from '@/lib/utils/format';

// Recharts chi render client-side — dynamic import de skip SSR
const AnalyticsCharts = dynamic(
  () => import('./charts').then((m) => m.AnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    ),
  },
);

interface AnalyticsData {
  pageviews: number;
  uniqueVisitors: number;
  avgSession: string;
  bounceRate: number;
  topPages: Array<{ path: string; views: number; uniqueViews: number }>;
  devices: Array<{ device: string; count: number; percent: number }>;
  sources: Array<{ source: string; visits: number; percent: number }>;
  traffic?: Array<{ date: string; views: number; visitors: number }>;
  revenue?: Array<{ date: string; revenue: number; orders: number }>;
}

/** Phan tich & Bao cao */
export default function AnalyticsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, loading } = useApi<{ data: AnalyticsData }>(
    '/admin/analytics',
    {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    },
  );
  const stats = data?.data;

  const handleExport = (_format: ExportFormat) => {
    // TODO: goi endpoint export analytics khi BE san sang
  };

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        title="Phan tich & Bao cao"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Phan tich' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36"
            />
            <span className="text-gray-400">-</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36"
            />
            <ExportButton onExport={handleExport} formats={['csv', 'excel']} />
            <PrintButton />
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={<Eye className="h-6 w-6" />}
              label="Luot xem trang"
              value={formatNumber(stats?.pageviews ?? 0)}
              trend={15.3}
              trendLabel="So voi ky truoc"
            />
            <StatCard
              icon={<Users className="h-6 w-6" />}
              label="Khach truy cap"
              value={formatNumber(stats?.uniqueVisitors ?? 0)}
              trend={8.7}
              trendLabel="So voi ky truoc"
            />
            <StatCard
              icon={<Clock className="h-6 w-6" />}
              label="Phien trung binh"
              value={stats?.avgSession ?? '0:00'}
              trend={-2.1}
              trendLabel="So voi ky truoc"
            />
            <StatCard
              icon={<ArrowDownUp className="h-6 w-6" />}
              label="Ty le thoat"
              value={`${stats?.bounceRate ?? 0}%`}
              trend={-1.5}
              trendLabel="So voi ky truoc"
            />
          </>
        )}
      </div>

      {/* Charts (real Recharts) */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <AnalyticsCharts
          traffic={stats?.traffic ?? []}
          revenue={stats?.revenue ?? []}
          devices={stats?.devices ?? []}
          topPages={stats?.topPages ?? []}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top pages table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Trang xem nhieu nhat</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trang</TableHead>
                  <TableHead className="text-right">Luot xem</TableHead>
                  <TableHead className="text-right">Khach duy nhat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : stats?.topPages?.length ? (
                  stats.topPages.map((page, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{page.path}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(page.views)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(page.uniqueViews)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-gray-500 h-24"
                    >
                      Chua co du lieu
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Device + Sources */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thiet bi</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(stats?.devices ?? []).map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {d.device === 'Desktop' ? (
                        <Monitor className="h-4 w-4 text-gray-400" />
                      ) : d.device === 'Mobile' ? (
                        <Smartphone className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Globe className="h-4 w-4 text-gray-400" />
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span>{d.device}</span>
                          <span className="text-gray-500">{d.percent}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full mt-1">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${d.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nguon truy cap</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(stats?.sources ?? []).map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{s.source}</span>
                      <span className="text-gray-500">
                        {formatNumber(s.visits)} ({s.percent}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
