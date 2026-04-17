'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type ColumnDef, type ActionDef } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { usePagination } from '@/lib/hooks/use-pagination';
import { formatDate } from '@/lib/utils/format';
import type { ApiResponse, Article } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nhap',
  PUBLISHED: 'Da xuat ban',
  ARCHIVED: 'Luu tru',
};

/** Danh sach bai viet */
export default function ArticlesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const pagination = usePagination();

  const params: Record<string, string | number | boolean | undefined> = {
    page: pagination.page, limit: pagination.limit,
    search: search || undefined, sort, order,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { data, loading, refetch } = useApi<ApiResponse<Article[]>>('/admin/articles', params);
  const articles = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const deleteMutation = useMutation('DELETE', `/admin/articles/${deleteId}`);

  const columns: ColumnDef<Article>[] = [
    {
      key: 'featured_image',
      header: 'Anh',
      className: 'w-16',
      render: (row) => (
        <div className="h-12 w-16 rounded bg-gray-100 overflow-hidden">
          {row.featured_image ? (
            <img src={row.featured_image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">N/A</div>
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Tieu de',
      sortable: true,
      render: (row) => (
        <div className="max-w-xs">
          <p className="font-medium truncate">{row.title}</p>
          <p className="text-xs text-gray-500 truncate">{row.excerpt ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'author',
      header: 'Tac gia',
      render: (row) => row.author?.name ?? '---',
    },
    {
      key: 'status',
      header: 'Trang thai',
      render: (row) => <StatusBadge status={row.status} label={STATUS_LABELS[row.status] ?? row.status} />,
    },
    {
      key: 'published_at',
      header: 'Ngay xuat ban',
      sortable: true,
      render: (row) => row.published_at ? formatDate(row.published_at) : '---',
    },
  ];

  const actions: ActionDef<Article>[] = [
    {
      label: 'Chinh sua',
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: (row) => { window.location.href = `/admin/articles/${row.id}`; },
    },
    {
      label: 'Xoa',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      variant: 'destructive',
      onClick: (row) => setDeleteId(row.id),
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
        title="Quan ly bai viet"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Bai viet' },
        ]}
        actions={
          <Button asChild>
            <a href="/admin/articles/new">
              <Plus className="h-4 w-4 mr-2" />
              Viet bai moi
            </a>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Trang thai" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca</SelectItem>
            <SelectItem value="DRAFT">Nhap</SelectItem>
            <SelectItem value="PUBLISHED">Da xuat ban</SelectItem>
            <SelectItem value="ARCHIVED">Luu tru</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={articles}
        loading={loading}
        page={pagination.page}
        totalPages={totalPages}
        onPageChange={pagination.setPage}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Tim theo tieu de..."
        sort={sort}
        order={order}
        onSort={(s, o) => { setSort(s); setOrder(o); }}
        actions={actions}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Xoa bai viet"
        description="Ban co chac chan muon xoa bai viet nay? Hanh dong nay khong the hoan tac."
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
