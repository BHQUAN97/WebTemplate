'use client';

import { useState } from 'react';
import { DollarSign, ShoppingCart, Users, Package, Plus, FileText, BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { PrintButton } from '@/components/shared/print-button';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/hooks/use-api';
import { formatPrice, formatDate, formatOrderStatus } from '@/lib/utils/format';
import type { ApiResponse, DashboardStats, Order, Product } from '@/lib/types';

/** Trang dashboard chinh cua admin */
export default function AdminDashboardPage() {
  const { data, loading } = useApi<ApiResponse<DashboardStats>>('/admin/dashboard');
  const stats = data?.data;

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        title="Dashboard"
        description="Tong quan hoat dong cua he thong"
        actions={<PrintButton />}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={<DollarSign className="h-6 w-6" />}
              label="Doanh thu"
              value={formatPrice(stats?.totalRevenue ?? 0)}
              trend={12.5}
              trendLabel="So voi thang truoc"
            />
            <StatCard
              icon={<ShoppingCart className="h-6 w-6" />}
              label="Don hang"
              value={stats?.totalOrders ?? 0}
              trend={8.2}
              trendLabel="So voi thang truoc"
            />
            <StatCard
              icon={<Users className="h-6 w-6" />}
              label="Khach hang"
              value={stats?.totalUsers ?? 0}
              trend={5.1}
              trendLabel="So voi thang truoc"
            />
            <StatCard
              icon={<Package className="h-6 w-6" />}
              label="Luot xem"
              value={stats?.totalPageviews ?? 0}
              trend={-2.3}
              trendLabel="So voi thang truoc"
            />
          </>
        )}
      </div>

      {/* Revenue chart placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Bieu do doanh thu</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Revenue Chart - integrate Recharts */}
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400">
            Revenue Chart - integrate Recharts
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Don hang gan day */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Don hang gan day</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ma don</TableHead>
                  <TableHead>Khach hang</TableHead>
                  <TableHead className="text-right">Tong tien</TableHead>
                  <TableHead>Trang thai</TableHead>
                  <TableHead>Ngay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : stats?.recentOrders?.length ? (
                  stats.recentOrders.map((order: Order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <a href={`/admin/orders/${order.id}`} className="text-blue-600 hover:underline">
                          {order.order_number}
                        </a>
                      </TableCell>
                      <TableCell>{order.user?.name ?? '---'}</TableCell>
                      <TableCell className="text-right">{formatPrice(order.total)}</TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} label={formatOrderStatus(order.status)} />
                      </TableCell>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 h-24">
                      Chua co don hang nao
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* San pham ban chay */}
        <Card>
          <CardHeader>
            <CardTitle>San pham ban chay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : stats?.topProducts?.length ? (
                stats.topProducts.map((item, i) => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-sm font-bold text-gray-500">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.totalSold} da ban &middot; {formatPrice(item.totalRevenue)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">Chua co du lieu</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Thao tac nhanh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href="/admin/products/new">
                <Plus className="h-4 w-4 mr-2" />
                Them san pham
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/admin/articles/new">
                <FileText className="h-4 w-4 mr-2" />
                Viet bai moi
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/admin/reports">
                <BarChart3 className="h-4 w-4 mr-2" />
                Xem bao cao
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
