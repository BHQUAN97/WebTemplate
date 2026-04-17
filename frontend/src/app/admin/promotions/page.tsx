'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type ColumnDef, type ActionDef } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { FormField } from '@/components/shared/form-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { usePagination } from '@/lib/hooks/use-pagination';
import { formatPrice, formatDate } from '@/lib/utils/format';
import type { ApiResponse, Promotion } from '@/lib/types';

const promotionSchema = z.object({
  code: z.string().min(1, 'Ma khuyen mai la bat buoc').max(50, 'Toi da 50 ky tu'),
  name: z.string().min(1, 'Ten la bat buoc').max(100, 'Toi da 100 ky tu'),
  description: z.string().optional(),
  discount_type: z.enum(['PERCENTAGE', 'FIXED'], { error: 'Chon loai giam gia' }),
  discount_value: z.number({ error: 'Gia tri phai la so' }).min(0, 'Gia tri khong duoc am'),
  min_order_amount: z.number().min(0, 'Khong duoc am').optional().nullable(),
  max_discount: z.number().min(0, 'Khong duoc am').optional().nullable(),
  usage_limit: z.number().min(0, 'Khong duoc am').optional().nullable(),
  start_date: z.string().min(1, 'Ngay bat dau la bat buoc'),
  end_date: z.string().min(1, 'Ngay ket thuc la bat buoc'),
  is_active: z.boolean(),
});

type PromotionForm = z.infer<typeof promotionSchema>;

/** Quan ly khuyen mai */
export default function PromotionsPage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<PromotionForm>({
    code: '', name: '', description: '', discount_type: 'PERCENTAGE',
    discount_value: 0, min_order_amount: null, max_discount: null,
    usage_limit: null, start_date: '', end_date: '', is_active: true,
  });

  const pagination = usePagination();

  const { data, loading, refetch } = useApi<ApiResponse<Promotion[]>>('/admin/promotions', {
    page: pagination.page, limit: pagination.limit,
    search: search || undefined, sort, order,
  });
  const promotions = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const saveMutation = useMutation(editingId ? 'PUT' : 'POST', editingId ? `/admin/promotions/${editingId}` : '/admin/promotions');
  const deleteMutation = useMutation('DELETE', `/admin/promotions/${deleteId}`);

  // Tinh trang thai khuyen mai
  const getPromoStatus = (promo: Promotion): { status: string; label: string } => {
    if (!promo.is_active) return { status: 'inactive', label: 'Tat' };
    const now = new Date();
    if (new Date(promo.start_date) > now) return { status: 'PENDING', label: 'Chua bat dau' };
    if (new Date(promo.end_date) < now) return { status: 'CLOSED', label: 'Het han' };
    if (promo.usage_limit && promo.used_count >= promo.usage_limit) return { status: 'CLOSED', label: 'Het luot' };
    return { status: 'active', label: 'Dang hoat dong' };
  };

  const columns: ColumnDef<Promotion>[] = [
    {
      key: 'code',
      header: 'Ma',
      render: (row) => (
        <span className="font-mono font-medium text-blue-600">{row.code}</span>
      ),
    },
    { key: 'name', header: 'Ten', sortable: true },
    {
      key: 'discount_type',
      header: 'Loai',
      render: (row) => (
        <Badge variant={row.discount_type === 'PERCENTAGE' ? 'default' : 'success'}>
          {row.discount_type === 'PERCENTAGE' ? 'Phan tram' : 'Co dinh'}
        </Badge>
      ),
    },
    {
      key: 'discount_value',
      header: 'Gia tri',
      render: (row) => (
        row.discount_type === 'PERCENTAGE'
          ? `${row.discount_value}%`
          : formatPrice(row.discount_value)
      ),
    },
    {
      key: 'usage',
      header: 'Su dung',
      render: (row) => `${row.used_count}/${row.usage_limit ?? '∞'}`,
    },
    {
      key: 'status',
      header: 'Trang thai',
      render: (row) => {
        const s = getPromoStatus(row);
        return <StatusBadge status={s.status} label={s.label} />;
      },
    },
    {
      key: 'dates',
      header: 'Thoi gian',
      render: (row) => (
        <div className="text-xs">
          <p>{formatDate(row.start_date)}</p>
          <p className="text-gray-400">- {formatDate(row.end_date)}</p>
        </div>
      ),
    },
  ];

  const actions: ActionDef<Promotion>[] = [
    {
      label: 'Chinh sua',
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: (row) => {
        setEditingId(row.id);
        setForm({
          code: row.code, name: row.name, description: row.description ?? '',
          discount_type: row.discount_type, discount_value: row.discount_value,
          min_order_amount: row.min_order_amount, max_discount: row.max_discount,
          usage_limit: row.usage_limit,
          start_date: row.start_date.slice(0, 10), end_date: row.end_date.slice(0, 10),
          is_active: row.is_active,
        });
        setErrors({});
        setDialogOpen(true);
      },
    },
    {
      label: 'Xoa',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      variant: 'destructive',
      onClick: (row) => setDeleteId(row.id),
    },
  ];

  const openCreate = () => {
    setEditingId(null);
    setForm({
      code: '', name: '', description: '', discount_type: 'PERCENTAGE',
      discount_value: 0, min_order_amount: null, max_discount: null,
      usage_limit: null, start_date: '', end_date: '', is_active: true,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const result = promotionSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.issues.forEach((e: any) => { fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      return;
    }
    const res = await saveMutation.mutate(result.data);
    if (res) { setDialogOpen(false); refetch(); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutate();
    setDeleteId(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quan ly khuyen mai"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Khuyen mai' },
        ]}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Tao ma giam gia
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={promotions}
        loading={loading}
        page={pagination.page}
        totalPages={totalPages}
        onPageChange={pagination.setPage}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Tim theo ma, ten..."
        sort={sort}
        order={order}
        onSort={(s, o) => { setSort(s); setOrder(o); }}
        actions={actions}
      />

      {/* Dialog tao/sua khuyen mai */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Chinh sua khuyen mai' : 'Tao ma giam gia moi'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Ma khuyen mai" error={errors.code} required>
                <Input
                  value={form.code}
                  onChange={(e) => { setForm((p) => ({ ...p, code: e.target.value.toUpperCase() })); setErrors((p) => ({ ...p, code: '' })); }}
                  placeholder="VD: SALE50"
                  className="font-mono"
                />
              </FormField>
              <FormField label="Ten" error={errors.name} required>
                <Input value={form.name} onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: '' })); }} />
              </FormField>
            </div>
            <FormField label="Mo ta" error={errors.description}>
              <Textarea value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Loai giam gia" error={errors.discount_type} required>
                <Select value={form.discount_type} onValueChange={(val) => setForm((p) => ({ ...p, discount_type: val as 'PERCENTAGE' | 'FIXED' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Phan tram (%)</SelectItem>
                    <SelectItem value="FIXED">So tien co dinh</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Gia tri" error={errors.discount_value} required>
                <Input type="number" value={form.discount_value} onChange={(e) => setForm((p) => ({ ...p, discount_value: parseFloat(e.target.value) || 0 }))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Don hang toi thieu" error={errors.min_order_amount}>
                <Input type="number" value={form.min_order_amount ?? ''} onChange={(e) => setForm((p) => ({ ...p, min_order_amount: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="0" />
              </FormField>
              <FormField label="Giam toi da" error={errors.max_discount}>
                <Input type="number" value={form.max_discount ?? ''} onChange={(e) => setForm((p) => ({ ...p, max_discount: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="Khong gioi han" />
              </FormField>
            </div>
            <FormField label="Gioi han luot dung" error={errors.usage_limit}>
              <Input type="number" value={form.usage_limit ?? ''} onChange={(e) => setForm((p) => ({ ...p, usage_limit: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Khong gioi han" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Ngay bat dau" error={errors.start_date} required>
                <Input type="date" value={form.start_date} onChange={(e) => { setForm((p) => ({ ...p, start_date: e.target.value })); setErrors((p) => ({ ...p, start_date: '' })); }} />
              </FormField>
              <FormField label="Ngay ket thuc" error={errors.end_date} required>
                <Input type="date" value={form.end_date} onChange={(e) => { setForm((p) => ({ ...p, end_date: e.target.value })); setErrors((p) => ({ ...p, end_date: '' })); }} />
              </FormField>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Kich hoat</span>
              <Switch checked={form.is_active} onCheckedChange={(c) => setForm((p) => ({ ...p, is_active: c }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Huy</Button>
            <Button onClick={handleSave} disabled={saveMutation.loading}>
              {saveMutation.loading ? 'Dang luu...' : 'Luu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Xoa khuyen mai"
        description="Ban co chac chan muon xoa ma khuyen mai nay?"
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
