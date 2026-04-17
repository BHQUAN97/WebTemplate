'use client';

import { useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type ColumnDef, type ActionDef } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ExportButton, type ExportFormat } from '@/components/shared/export-button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useApi } from '@/lib/hooks/use-api';
import { usePagination } from '@/lib/hooks/use-pagination';
import { formatPrice, formatDate, formatOrderStatus, formatPaymentStatus } from '@/lib/utils/format';
import type { ApiResponse, Order, OrderStatus } from '@/lib/types';

/** Danh sach don hang */
export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');

  const pagination = usePagination();

  const params: Record<string, string | number | boolean | undefined> = {
    page: pagination.page,
    limit: pagination.limit,
    search: search || undefined,
    sort,
    order,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  const { data, loading } = useApi<ApiResponse<Order[]>>('/admin/orders', params);
  const orders = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const columns: ColumnDef<Order>[] = [
    {
      key: 'order_number',
      header: 'Ma don',
      sortable: true,
      render: (row) => (
        <a href={`/admin/orders/${row.id}`} className="text-blue-600 hover:underline font-medium">
          {row.order_number}
        </a>
      ),
    },
    {
      key: 'customer',
      header: 'Khach hang',
      render: (row) => (
        <div>
          <p className="font-medium">{row.user?.name ?? row.shipping_name}</p>
          <p className="text-xs text-gray-500">{row.user?.email ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'SP',
      render: (row) => <span>{row.items?.length ?? 0}</span>,
    },
    {
      key: 'total',
      header: 'Tong tien',
      sortable: true,
      className: 'text-right',
      render: (row) => <span className="font-medium">{formatPrice(row.total)}</span>,
    },
    {
      key: 'status',
      header: 'Trang thai',
      render: (row) => <StatusBadge status={row.status} label={formatOrderStatus(row.status)} />,
    },
    {
      key: 'payment',
      header: 'Thanh toan',
      render: (row) => (
        <StatusBadge
          status={row.payment?.status ?? 'PENDING'}
          label={formatPaymentStatus(row.payment?.status ?? 'PENDING')}
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Ngay tao',
      sortable: true,
      render: (row) => formatDate(row.created_at),
    },
  ];

  const actions: ActionDef<Order>[] = [
    {
      label: 'Xem chi tiet',
      icon: <Eye className="h-4 w-4 mr-2" />,
      onClick: (row) => { window.location.href = `/admin/orders/${row.id}`; },
    },
  ];

  const handleExport = (format: ExportFormat) => {
    // Goi API export
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quan ly don hang"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Don hang' },
        ]}
        actions={<ExportButton onExport={handleExport} />}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Trang thai" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca trang thai</SelectItem>
            <SelectItem value="PENDING">Cho xac nhan</SelectItem>
            <SelectItem value="CONFIRMED">Da xac nhan</SelectItem>
            <SelectItem value="PROCESSING">Dang xu ly</SelectItem>
            <SelectItem value="SHIPPED">Dang giao</SelectItem>
            <SelectItem value="DELIVERED">Da giao</SelectItem>
            <SelectItem value="CANCELLED">Da huy</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full sm:w-44"
          placeholder="Tu ngay"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full sm:w-44"
          placeholder="Den ngay"
        />
      </div>

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        page={pagination.page}
        totalPages={totalPages}
        onPageChange={pagination.setPage}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Tim theo ma don hang..."
        sort={sort}
        order={order}
        onSort={(s, o) => { setSort(s); setOrder(o); }}
        actions={actions}
      />
    </div>
  );
}
