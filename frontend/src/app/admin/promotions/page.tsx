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
  code: z.string().min(1, 'Mã khuyến mãi là bắt buộc').max(50, 'Tối đa 50 ký tự'),
  name: z.string().min(1, 'Tên là bắt buộc').max(100, 'Tối đa 100 ký tự'),
  description: z.string().optional(),
  discount_type: z.enum(['PERCENTAGE', 'FIXED'], { error: 'Chọn loại giảm giá' }),
  discount_value: z.number({ error: 'Giá trị phải là số' }).min(0, 'Giá trị không được âm'),
  min_order_amount: z.number().min(0, 'Không được âm').optional().nullable(),
  max_discount: z.number().min(0, 'Không được âm').optional().nullable(),
  usage_limit: z.number().min(0, 'Không được âm').optional().nullable(),
  start_date: z.string().min(1, 'Ngày bắt đầu là bắt buộc'),
  end_date: z.string().min(1, 'Ngày kết thúc là bắt buộc'),
  is_active: z.boolean(),
});

type PromotionForm = z.infer<typeof promotionSchema>;

/** Quản lý Khuyến mãi */
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

  // Tinh Trạng thái Khuyến mãi
  const getPromoStatus = (promo: Promotion): { status: string; label: string } => {
    if (!promo.is_active) return { status: 'inactive', label: 'Tắt' };
    const now = new Date();
    if (new Date(promo.start_date) > now) return { status: 'PENDING', label: 'Chưa bắt đầu' };
    if (new Date(promo.end_date) < now) return { status: 'CLOSED', label: 'Hết hạn' };
    if (promo.usage_limit && promo.used_count >= promo.usage_limit) return { status: 'CLOSED', label: 'Hết lượt' };
    return { status: 'active', label: 'Đang hoạt động' };
  };

  const columns: ColumnDef<Promotion>[] = [
    {
      key: 'code',
      header: 'Mã',
      render: (row) => (
        <span className="font-mono font-medium text-blue-600">{row.code}</span>
      ),
    },
    { key: 'name', header: 'Tên', sortable: true },
    {
      key: 'discount_type',
      header: 'Loại',
      render: (row) => (
        <Badge variant={row.discount_type === 'PERCENTAGE' ? 'default' : 'success'}>
          {row.discount_type === 'PERCENTAGE' ? 'Phần trăm' : 'Cố định'}
        </Badge>
      ),
    },
    {
      key: 'discount_value',
      header: 'Giá trị',
      render: (row) => (
        row.discount_type === 'PERCENTAGE'
          ? `${row.discount_value}%`
          : formatPrice(row.discount_value)
      ),
    },
    {
      key: 'usage',
      header: 'Sử dụng',
      render: (row) => `${row.used_count}/${row.usage_limit ?? '∞'}`,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => {
        const s = getPromoStatus(row);
        return <StatusBadge status={s.status} label={s.label} />;
      },
    },
    {
      key: 'dates',
      header: 'Thời gian',
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
      label: 'Chỉnh sửa',
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
      label: 'Xóa',
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
        title="Quản lý Khuyến mãi"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Khuyến mãi' },
        ]}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo Mã giảm giá
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
        searchPlaceholder="Tìm theo mã, tên..."
        sort={sort}
        order={order}
        onSort={(s, o) => { setSort(s); setOrder(o); }}
        actions={actions}
      />

      {/* Dialog tao/sua Khuyến mãi */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Chỉnh sửa khuyến mãi' : 'Tạo mã giảm giá mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Mã Khuyến mãi" error={errors.code} required>
                <Input
                  value={form.code}
                  onChange={(e) => { setForm((p) => ({ ...p, code: e.target.value.toUpperCase() })); setErrors((p) => ({ ...p, code: '' })); }}
                  placeholder="VD: SALE50"
                  className="font-mono"
                />
              </FormField>
              <FormField label="Tên" error={errors.name} required>
                <Input value={form.name} onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: '' })); }} />
              </FormField>
            </div>
            <FormField label="Mô tả" error={errors.description}>
              <Textarea value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Loại giảm giá" error={errors.discount_type} required>
                <Select value={form.discount_type} onValueChange={(val) => setForm((p) => ({ ...p, discount_type: val as 'PERCENTAGE' | 'FIXED' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Phần trăm (%)</SelectItem>
                    <SelectItem value="FIXED">Số tiền cố định</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Giá trị" error={errors.discount_value} required>
                <Input type="number" value={form.discount_value} onChange={(e) => setForm((p) => ({ ...p, discount_value: parseFloat(e.target.value) || 0 }))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Đơn hàng Tối thiểu" error={errors.min_order_amount}>
                <Input type="number" value={form.min_order_amount ?? ''} onChange={(e) => setForm((p) => ({ ...p, min_order_amount: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="0" />
              </FormField>
              <FormField label="Giam Tối đa" error={errors.max_discount}>
                <Input type="number" value={form.max_discount ?? ''} onChange={(e) => setForm((p) => ({ ...p, max_discount: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="Không giới hạn" />
              </FormField>
            </div>
            <FormField label="Giới hạn lượt dùng" error={errors.usage_limit}>
              <Input type="number" value={form.usage_limit ?? ''} onChange={(e) => setForm((p) => ({ ...p, usage_limit: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Không giới hạn" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Ngày bắt đầu" error={errors.start_date} required>
                <Input type="date" value={form.start_date} onChange={(e) => { setForm((p) => ({ ...p, start_date: e.target.value })); setErrors((p) => ({ ...p, start_date: '' })); }} />
              </FormField>
              <FormField label="Ngày kết thúc" error={errors.end_date} required>
                <Input type="date" value={form.end_date} onChange={(e) => { setForm((p) => ({ ...p, end_date: e.target.value })); setErrors((p) => ({ ...p, end_date: '' })); }} />
              </FormField>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Kích hoạt</span>
              <Switch checked={form.is_active} onCheckedChange={(c) => setForm((p) => ({ ...p, is_active: c }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saveMutation.loading}>
              {saveMutation.loading ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Xóa Khuyến mãi"
        description="Bạn có chắc chắn muốn xóa mã Khuyến mãi này?"
        onConfirm={handleDelete}
        confirmLabel="Xóa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
