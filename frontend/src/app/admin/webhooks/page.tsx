'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Send, Power, PowerOff, Eye } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type ColumnDef, type ActionDef } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { usePagination } from '@/lib/hooks/use-pagination';
import { formatDate } from '@/lib/utils/format';
import { useToast } from '@/lib/hooks/use-toast';
import type { ApiResponse } from '@/lib/types';
import type { Webhook } from '@/lib/api/modules/webhooks.api';

/** Quan ly Webhooks */
export default function WebhooksPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testId, setTestId] = useState<string | null>(null);

  const pagination = usePagination();

  const params: Record<string, string | number | boolean | undefined> = {
    page: pagination.page,
    limit: pagination.limit,
    search: search || undefined,
    sort,
    order,
  };

  const { data, loading, refetch } = useApi<ApiResponse<Webhook[]>>(
    '/admin/webhooks',
    params,
  );
  const webhooks = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const deleteMutation = useMutation('DELETE', deleteId ? `/admin/webhooks/${deleteId}` : '');
  const testMutation = useMutation<unknown, { success: boolean }>(
    'POST',
    testId ? `/admin/webhooks/${testId}/test` : '',
  );

  const columns: ColumnDef<Webhook>[] = [
    {
      key: 'url',
      header: 'URL',
      render: (row) => (
        <div className="font-mono text-xs max-w-xs truncate" title={row.url}>
          {row.url}
        </div>
      ),
    },
    {
      key: 'events',
      header: 'Su kien',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.events?.slice(0, 3).map((e) => (
            <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
          ))}
          {row.events && row.events.length > 3 && (
            <Badge variant="secondary" className="text-xs">+{row.events.length - 3}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Trang thai',
      render: (row) => (
        <StatusBadge
          status={row.is_active ? 'active' : 'inactive'}
          label={row.is_active ? 'Hoat dong' : 'Tam dung'}
        />
      ),
    },
    {
      key: 'success_rate',
      header: 'Ty le thanh cong',
      render: (row) => {
        const total = (row.success_count ?? 0) + (row.failure_count ?? 0);
        const rate = total > 0 ? (row.success_count / total) * 100 : 0;
        return (
          <span className={rate >= 90 ? 'text-green-600' : rate >= 50 ? 'text-orange-600' : 'text-red-600'}>
            {total > 0 ? `${rate.toFixed(1)}%` : '---'}
          </span>
        );
      },
    },
    {
      key: 'last_triggered_at',
      header: 'Lan cuoi',
      render: (row) =>
        row.last_triggered_at ? formatDate(row.last_triggered_at) : 'Chua kich hoat',
    },
  ];

  const actions: ActionDef<Webhook>[] = [
    {
      label: 'Xem chi tiet',
      icon: <Eye className="h-4 w-4 mr-2" />,
      onClick: (row) => { window.location.href = `/admin/webhooks/${row.id}`; },
    },
    {
      label: 'Chinh sua',
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: (row) => { window.location.href = `/admin/webhooks/${row.id}`; },
    },
    {
      label: 'Test',
      icon: <Send className="h-4 w-4 mr-2" />,
      onClick: (row) => setTestId(row.id),
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

  const handleTest = async () => {
    if (!testId) return;
    const res = await testMutation.mutate();
    setTestId(null);
    if (res) {
      toast(
        res.success ? 'Test thanh cong' : 'Test that bai',
        undefined,
        res.success ? 'success' : 'destructive',
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Cau hinh gui su kien toi endpoint ben ngoai"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Webhooks' },
        ]}
        actions={
          <Button asChild>
            <a href="/admin/webhooks/new">
              <Plus className="h-4 w-4 mr-2" />
              Them webhook
            </a>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={webhooks}
        loading={loading}
        page={pagination.page}
        totalPages={totalPages}
        onPageChange={pagination.setPage}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Tim theo URL..."
        sort={sort}
        order={order}
        onSort={(s, o) => { setSort(s); setOrder(o); }}
        actions={actions}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xoa webhook"
        description="Ban co chac chan muon xoa webhook nay? Hanh dong nay khong the hoan tac."
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
        loading={deleteMutation.loading}
      />

      <ConfirmDialog
        open={!!testId}
        onOpenChange={(o) => !o && setTestId(null)}
        title="Test webhook"
        description="Gui 1 payload test den URL nay?"
        onConfirm={handleTest}
        confirmLabel="Gui test"
        loading={testMutation.loading}
      />
    </div>
  );
}
