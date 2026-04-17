'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Power, PowerOff, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type ColumnDef, type ActionDef, type BulkActionDef } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { usePagination } from '@/lib/hooks/use-pagination';
import { formatPrice } from '@/lib/utils/format';
import type { ApiResponse, Product, PaginationMeta } from '@/lib/types';

/** Danh sach san pham */
export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const pagination = usePagination();

  const params: Record<string, string | number | boolean | undefined> = {
    page: pagination.page,
    limit: pagination.limit,
    search: search || undefined,
    sort,
    order,
    category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
    is_active: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { data, loading, refetch } = useApi<ApiResponse<Product[]>>('/admin/products', params);
  const products = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const deleteMutation = useMutation('DELETE', `/admin/products/${deleteId}`);

  // Cot bang san pham
  const columns: ColumnDef<Product>[] = [
    {
      key: 'image',
      header: 'Anh',
      className: 'w-16',
      render: (row) => (
        <div className="h-12 w-12 rounded bg-gray-100 overflow-hidden">
          {row.images?.[0] ? (
            <img src={row.images[0].url} alt={row.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">N/A</div>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Ten san pham',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-gray-500">{row.sku ?? '---'}</p>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Gia',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{formatPrice(row.price)}</p>
          {row.compare_at_price && (
            <p className="text-xs text-gray-400 line-through">{formatPrice(row.compare_at_price)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Ton kho',
      sortable: true,
      render: (row) => (
        <span className={row.quantity <= 0 ? 'text-red-600 font-medium' : ''}>
          {row.quantity}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Danh muc',
      render: (row) => row.category?.name ?? '---',
    },
    {
      key: 'is_active',
      header: 'Trang thai',
      render: (row) => (
        <StatusBadge
          status={row.is_active ? 'active' : 'inactive'}
          label={row.is_active ? 'Dang ban' : 'Ngung ban'}
        />
      ),
    },
  ];

  const actions: ActionDef<Product>[] = [
    {
      label: 'Chinh sua',
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: (row) => { window.location.href = `/admin/products/${row.id}`; },
    },
    {
      label: 'Xoa',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      variant: 'destructive',
      onClick: (row) => setDeleteId(row.id),
    },
  ];

  const bulkActions: BulkActionDef[] = [
    {
      label: 'Xoa',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      variant: 'destructive',
      onClick: (ids) => { /* Bulk delete */ },
    },
    {
      label: 'Kich hoat',
      icon: <Power className="h-4 w-4 mr-2" />,
      onClick: (ids) => { /* Bulk activate */ },
    },
    {
      label: 'Vo hieu hoa',
      icon: <PowerOff className="h-4 w-4 mr-2" />,
      onClick: (ids) => { /* Bulk deactivate */ },
    },
  ];

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutate();
    setDeleteId(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quan ly san pham"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'San pham' },
        ]}
        actions={
          <Button asChild>
            <a href="/admin/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Them san pham
            </a>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Danh muc" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca danh muc</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Trang thai" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca trang thai</SelectItem>
            <SelectItem value="true">Dang ban</SelectItem>
            <SelectItem value="false">Ngung ban</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        page={pagination.page}
        totalPages={totalPages}
        onPageChange={pagination.setPage}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Tim theo ten, SKU..."
        sort={sort}
        order={order}
        onSort={(s, o) => { setSort(s); setOrder(o); }}
        actions={actions}
        bulkActions={bulkActions}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Xoa san pham"
        description="Ban co chac chan muon xoa san pham nay? Hanh dong nay khong the hoan tac."
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
