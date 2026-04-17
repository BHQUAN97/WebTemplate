'use client';

import { useState } from 'react';
import { BarChart3, Package, Users, ShoppingBag, Warehouse } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { PrintButton } from '@/components/shared/print-button';
import { ExportButton, type ExportFormat } from '@/components/shared/export-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/hooks/use-api';
import { formatPrice, formatNumber, formatDate } from '@/lib/utils/format';

type ReportType = 'sales' | 'products' | 'customers' | 'inventory';

const REPORT_TYPES: { type: ReportType; icon: React.ReactNode; title: string; description: string }[] = [
  { type: 'sales', icon: <BarChart3 className="h-8 w-8 text-blue-500" />, title: 'Bao cao doanh thu', description: 'Doanh thu, don hang, thanh toan theo thoi gian' },
  { type: 'products', icon: <Package className="h-8 w-8 text-green-500" />, title: 'Bao cao san pham', description: 'San pham ban chay, ton kho, loi nhuan' },
  { type: 'customers', icon: <Users className="h-8 w-8 text-purple-500" />, title: 'Bao cao khach hang', description: 'Khach hang moi, ty le quay lai, gia tri' },
  { type: 'inventory', icon: <Warehouse className="h-8 w-8 text-orange-500" />, title: 'Bao cao ton kho', description: 'Tinh trang kho, san pham sap het, nhap hang' },
];

/** Bao cao */
export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, loading } = useApi<{ data: Record<string, unknown>[] }>(
    selectedReport ? `/admin/reports/${selectedReport}` : null,
    { date_from: dateFrom || undefined, date_to: dateTo || undefined },
  );

  const handleExport = (format: ExportFormat) => {
    // Goi API export report
  };

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        title="Bao cao"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Bao cao' },
        ]}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <PrintButton />
            <ExportButton onExport={handleExport} formats={['csv', 'excel']} />
          </div>
        }
      />

      {/* Report type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {REPORT_TYPES.map((rt) => (
          <Card
            key={rt.type}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedReport === rt.type ? 'ring-2 ring-blue-500 border-blue-500' : ''
            }`}
            onClick={() => setSelectedReport(rt.type)}
          >
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-3">{rt.icon}</div>
              <CardTitle className="text-base mb-1">{rt.title}</CardTitle>
              <CardDescription className="text-xs">{rt.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Date range */}
      {selectedReport && (
        <div className="flex flex-col sm:flex-row gap-3 items-center print:hidden">
          <span className="text-sm text-gray-500">Khoang thoi gian:</span>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-44" />
          <span className="text-gray-400">-</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-44" />
        </div>
      )}

      {/* Report preview */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle>{REPORT_TYPES.find((r) => r.type === selectedReport)?.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : selectedReport === 'sales' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngay</TableHead>
                    <TableHead className="text-right">Don hang</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                    <TableHead className="text-right">Giam gia</TableHead>
                    <TableHead className="text-right">Thuc thu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.data ?? []).length > 0 ? (
                    (data?.data ?? []).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{String(row.date ?? '')}</TableCell>
                        <TableCell className="text-right">{String(row.orders ?? 0)}</TableCell>
                        <TableCell className="text-right">{formatPrice(Number(row.revenue ?? 0))}</TableCell>
                        <TableCell className="text-right">{formatPrice(Number(row.discount ?? 0))}</TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(Number(row.net ?? 0))}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 h-24">Chon khoang thoi gian de xem bao cao</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : selectedReport === 'products' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>San pham</TableHead>
                    <TableHead className="text-right">Da ban</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                    <TableHead className="text-right">Ton kho</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.data ?? []).length > 0 ? (
                    (data?.data ?? []).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{String(row.name ?? '')}</TableCell>
                        <TableCell className="text-right">{String(row.sold ?? 0)}</TableCell>
                        <TableCell className="text-right">{formatPrice(Number(row.revenue ?? 0))}</TableCell>
                        <TableCell className="text-right">{String(row.stock ?? 0)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 h-24">Chua co du lieu</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : selectedReport === 'customers' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khach hang</TableHead>
                    <TableHead className="text-right">Don hang</TableHead>
                    <TableHead className="text-right">Tong chi tieu</TableHead>
                    <TableHead>Ngay tham gia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.data ?? []).length > 0 ? (
                    (data?.data ?? []).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{String(row.name ?? '')}</TableCell>
                        <TableCell className="text-right">{String(row.orders ?? 0)}</TableCell>
                        <TableCell className="text-right">{formatPrice(Number(row.total_spent ?? 0))}</TableCell>
                        <TableCell>{row.joined ? formatDate(String(row.joined)) : '---'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 h-24">Chua co du lieu</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>San pham</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Ton kho</TableHead>
                    <TableHead>Trang thai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.data ?? []).length > 0 ? (
                    (data?.data ?? []).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{String(row.name ?? '')}</TableCell>
                        <TableCell className="text-gray-500">{String(row.sku ?? '')}</TableCell>
                        <TableCell className="text-right">{String(row.stock ?? 0)}</TableCell>
                        <TableCell>{String(row.status ?? '')}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 h-24">Chua co du lieu</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedReport && (
        <div className="text-center py-12 text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p>Chon loai bao cao o tren de bat dau</p>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
