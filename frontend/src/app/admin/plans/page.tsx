'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { FormField } from '@/components/shared/form-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { formatPrice, slugify } from '@/lib/utils/format';
import type { ApiResponse, Plan } from '@/lib/types';

const planSchema = z.object({
  name: z.string().min(1, 'Ten goi la bat buoc').max(50, 'Toi da 50 ky tu'),
  slug: z.string().min(1, 'Slug la bat buoc'),
  description: z.string().optional(),
  price_monthly: z.number({ error: 'Gia phai la so' }).min(0, 'Gia khong duoc am'),
  price_yearly: z.number({ error: 'Gia phai la so' }).min(0, 'Gia khong duoc am'),
  max_users: z.number().min(1, 'Toi thieu 1 nguoi dung'),
  max_products: z.number().min(0, 'Khong duoc am'),
  max_storage_mb: z.number().min(0, 'Khong duoc am'),
  is_active: z.boolean(),
});

type PlanForm = z.infer<typeof planSchema>;

/** Quan ly goi dich vu */
export default function PlansPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<PlanForm>({
    name: '', slug: '', description: '',
    price_monthly: 0, price_yearly: 0,
    max_users: 1, max_products: 100, max_storage_mb: 500,
    is_active: true,
  });

  const { data, loading, refetch } = useApi<ApiResponse<Plan[]>>('/admin/plans');
  const plans = data?.data ?? [];

  const saveMutation = useMutation(editingId ? 'PUT' : 'POST', editingId ? `/admin/plans/${editingId}` : '/admin/plans');
  const deleteMutation = useMutation('DELETE', `/admin/plans/${deleteId}`);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', slug: '', description: '', price_monthly: 0, price_yearly: 0, max_users: 1, max_products: 100, max_storage_mb: 500, is_active: true });
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name, slug: plan.slug, description: plan.description ?? '',
      price_monthly: plan.price_monthly, price_yearly: plan.price_yearly,
      max_users: plan.max_users, max_products: plan.max_products,
      max_storage_mb: plan.max_storage_mb, is_active: plan.is_active,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const result = planSchema.safeParse(form);
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
        title="Quan ly goi dich vu"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Goi dich vu' },
        ]}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Tao goi moi
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>Chua co goi dich vu nao</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Tao goi dau tien
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  <StatusBadge
                    status={plan.is_active ? 'active' : 'inactive'}
                    label={plan.is_active ? 'Hoat dong' : 'Tat'}
                  />
                </div>
                {plan.description && (
                  <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold">{formatPrice(plan.price_monthly)}</p>
                  <p className="text-sm text-gray-500">/thang</p>
                  <p className="text-xs text-gray-400 mt-1">
                    hoac {formatPrice(plan.price_yearly)}/nam
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nguoi dung</span>
                    <span className="font-medium">{plan.max_users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">San pham</span>
                    <span className="font-medium">{plan.max_products}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Luu tru</span>
                    <span className="font-medium">{plan.max_storage_mb}MB</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(plan)}>
                  <Pencil className="h-4 w-4 mr-1" /> Sua
                </Button>
                <Button variant="outline" size="sm" className="text-red-600" onClick={() => setDeleteId(plan.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog tao/sua plan */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Chinh sua goi dich vu' : 'Tao goi dich vu moi'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField label="Ten goi" error={errors.name} required>
              <Input
                value={form.name}
                onChange={(e) => {
                  setForm((p) => ({ ...p, name: e.target.value, slug: slugify(e.target.value) }));
                  setErrors((p) => ({ ...p, name: '' }));
                }}
              />
            </FormField>
            <FormField label="Slug" error={errors.slug} required>
              <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
            </FormField>
            <FormField label="Mo ta" error={errors.description}>
              <Textarea value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Gia thang" error={errors.price_monthly} required>
                <Input type="number" value={form.price_monthly} onChange={(e) => setForm((p) => ({ ...p, price_monthly: parseFloat(e.target.value) || 0 }))} />
              </FormField>
              <FormField label="Gia nam" error={errors.price_yearly} required>
                <Input type="number" value={form.price_yearly} onChange={(e) => setForm((p) => ({ ...p, price_yearly: parseFloat(e.target.value) || 0 }))} />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Max Users" error={errors.max_users}>
                <Input type="number" value={form.max_users} onChange={(e) => setForm((p) => ({ ...p, max_users: parseInt(e.target.value) || 1 }))} />
              </FormField>
              <FormField label="Max Products" error={errors.max_products}>
                <Input type="number" value={form.max_products} onChange={(e) => setForm((p) => ({ ...p, max_products: parseInt(e.target.value) || 0 }))} />
              </FormField>
              <FormField label="Storage (MB)" error={errors.max_storage_mb}>
                <Input type="number" value={form.max_storage_mb} onChange={(e) => setForm((p) => ({ ...p, max_storage_mb: parseInt(e.target.value) || 0 }))} />
              </FormField>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Hoat dong</span>
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
        title="Xoa goi dich vu"
        description="Ban co chac chan muon xoa goi dich vu nay? Cac subscribers hien tai se bi anh huong."
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
