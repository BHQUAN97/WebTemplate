'use client';

import { useState } from 'react';
import { Package, AlertTriangle, XCircle, Pencil, History } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type ColumnDef, type ActionDef } from '@/components/shared/data-table';
import { StatCard } from '@/components/shared/stat-card';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { usePagination } from '@/lib/hooks/use-pagination';
import { formatDate } from '@/lib/utils/format';
import type { ApiResponse } from '@/lib/types';
import type { InventoryItem, InventoryHistory } from '@/lib/api/modules/inventory.api';

/** Quan ly ton kho */
export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [outOfStock, setOutOfStock] = useState(false);
  const [sort, setSort] = useState('last_updated');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');

  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    quantity: 0,
    reason: '',
    note: '',
  });

  const pagination = usePagination();

  const params: Record<string, string | number | boolean | undefined> = {
    page: pagination.page,
    limit: pagination.limit,
    search: search || undefined,
    sort,
    order,
    low_stock: lowStock || undefined,
    out_of_stock: outOfStock || undefined,
  };

  const { data, loading, refetch } = useApi<ApiResponse<InventoryItem[]>>(
    '/admin/inventory',
    params,
  );
  const items = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const stats = useApi<
    ApiResponse<{
      total_sku: number;
      low_stock_count: number;
      out_of_stock_count: number;
    }>
  >('/admin/inventory/stats');

  const adjustMutation = useMutation(
    'POST',
    adjustItem ? `/admin/inventory/${adjustItem.id}/adjust` : '',
  );

  const history = useApi<ApiResponse<InventoryHistory[]>>(
    historyItem ? `/admin/inventory/${historyItem.id}/history` : null,
    { limit: 20 },
  );

  const columns: ColumnDef<InventoryItem>[] = [
    {
      key: 'product_name',
      header: 'San pham',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{row.product_name ?? '---'}</p>
          <p className="text-xs text-gray-500 font-mono">{row.sku}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Ton kho',
      sortable: true,
      render: (row) => {
        const available = row.quantity - row.reserved_quantity;
        const isOut = available <= 0;
        const isLow = !isOut && available <= row.low_stock_threshold;
        return (
          <div>
            <span className={isOut ? 'text-red-600 font-bold' : isLow ? 'text-orange-600 font-semibold' : 'font-medium'}>
              {row.quantity}
            </span>
            {row.reserved_quantity > 0 && (
              <span className="text-xs text-gray-500 ml-2">
                ({row.reserved_quantity} dat cho)
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'available',
      header: 'Co san',
      render: (row) => {
        const available = row.quantity - row.reserved_quantity;
        return <span>{available}</span>;
      },
    },
    {
      key: 'low_stock_threshold',
      header: 'Nguong canh bao',
      render: (row) => row.low_stock_threshold,
    },
    {
      key: 'status',
      header: 'Trang thai',
      render: (row) => {
        const available = row.quantity - row.reserved_quantity;
        if (available <= 0) return <Badge variant="destructive">Het hang</Badge>;
        if (available <= row.low_stock_threshold) return <Badge variant="warning">Sap het</Badge>;
        return <Badge variant="success">Du hang</Badge>;
      },
    },
    {
      key: 'last_updated',
      header: 'Cap nhat',
      sortable: true,
      render: (row) => (row.last_updated ? formatDate(row.last_updated) : formatDate(row.updated_at)),
    },
  ];

  const actions: ActionDef<InventoryItem>[] = [
    {
      label: 'Dieu chinh so luong',
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: (row) => {
        setAdjustItem(row);
        setAdjustForm({ quantity: row.quantity, reason: '', note: '' });
      },
    },
    {
      label: 'Lich su',
      icon: <History className="h-4 w-4 mr-2" />,
      onClick: (row) => setHistoryItem(row),
    },
  ];

  const handleAdjust = async () => {
    if (!adjustItem) return;
    const res = await adjustMutation.mutate(adjustForm);
    if (res) {
      setAdjustItem(null);
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quan ly ton kho"
        description="Theo doi so luong va canh bao het hang"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Ton kho' },
        ]}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Package className="h-5 w-5" />}
          label="Tong SKU"
          value={stats.data?.data?.total_sku ?? 0}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="SKU sap het hang"
          value={stats.data?.data?.low_stock_count ?? 0}
        />
        <StatCard
          icon={<XCircle className="h-5 w-5" />}
          label="SKU het hang"
          value={stats.data?.data?.out_of_stock_count ?? 0}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={lowStock} onCheckedChange={setLowStock} />
          Chi SKU sap het
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={outOfStock} onCheckedChange={setOutOfStock} />
          Chi SKU het hang
        </label>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        page={pagination.page}
        totalPages={totalPages}
        onPageChange={pagination.setPage}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Tim theo ten san pham, SKU..."
        sort={sort}
        order={order}
        onSort={(s, o) => { setSort(s); setOrder(o); }}
        actions={actions}
      />

      {/* Dialog dieu chinh so luong */}
      <Dialog open={!!adjustItem} onOpenChange={(o) => !o && setAdjustItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dieu chinh ton kho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-500">
              SKU: <span className="font-mono">{adjustItem?.sku}</span>
            </p>
            <p className="text-sm text-gray-500">
              Hien tai: <span className="font-bold">{adjustItem?.quantity}</span>
            </p>
            <FormField label="So luong moi" required>
              <Input
                type="number"
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
              />
            </FormField>
            <FormField label="Ly do" required>
              <Input
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="VD: Nhap hang, kiem ke, hu hong..."
              />
            </FormField>
            <FormField label="Ghi chu">
              <Textarea
                rows={3}
                value={adjustForm.note}
                onChange={(e) => setAdjustForm((p) => ({ ...p, note: e.target.value }))}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustItem(null)}>Huy</Button>
            <Button onClick={handleAdjust} disabled={adjustMutation.loading || !adjustForm.reason}>
              {adjustMutation.loading ? 'Dang luu...' : 'Luu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog lich su */}
      <Dialog open={!!historyItem} onOpenChange={(o) => !o && setHistoryItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lich su ton kho</DialogTitle>
          </DialogHeader>
          <div className="py-2 max-h-[60vh] overflow-y-auto">
            {history.loading ? (
              <Skeleton className="h-40" />
            ) : history.data?.data?.length ? (
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b">
                  <tr>
                    <th className="py-2">Thoi gian</th>
                    <th>Loai</th>
                    <th>SL</th>
                    <th>Ly do</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.data.map((h) => (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="py-2">{formatDate(h.created_at)}</td>
                      <td><Badge variant="secondary">{h.type}</Badge></td>
                      <td>{h.quantity}</td>
                      <td className="text-gray-600">{h.reason ?? '---'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-500">Chua co lich su</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
