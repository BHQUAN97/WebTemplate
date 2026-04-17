'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type ColumnDef, type ActionDef } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { FormField } from '@/components/shared/form-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { usePagination } from '@/lib/hooks/use-pagination';
import { formatDate } from '@/lib/utils/format';
import type { ApiResponse, User, UserRole } from '@/lib/types';

const userSchema = z.object({
  name: z.string().min(1, 'Ten la bat buoc').max(100, 'Toi da 100 ky tu'),
  email: z.string().email('Email khong hop le'),
  password: z.string().min(6, 'Mat khau toi thieu 6 ky tu').optional(),
  phone: z.string().optional().nullable(),
  role: z.string().min(1, 'Vai tro la bat buoc'),
  is_active: z.boolean(),
});

type UserForm = z.infer<typeof userSchema>;

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  ADMIN: 'destructive',
  MANAGER: 'warning',
  EDITOR: 'default',
  USER: 'secondary',
};

/** Quan ly khach hang */
export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<UserForm>({
    name: '', email: '', password: '', phone: null, role: 'USER', is_active: true,
  });

  const pagination = usePagination();

  const params: Record<string, string | number | boolean | undefined> = {
    page: pagination.page, limit: pagination.limit,
    search: search || undefined, sort, order,
    role: roleFilter !== 'all' ? roleFilter : undefined,
  };

  const { data, loading, refetch } = useApi<ApiResponse<User[]>>('/admin/users', params);
  const users = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const saveMutation = useMutation(editingId ? 'PUT' : 'POST', editingId ? `/admin/users/${editingId}` : '/admin/users');
  const deleteMutation = useMutation('DELETE', `/admin/users/${deleteId}`);

  const columns: ColumnDef<User>[] = [
    {
      key: 'avatar',
      header: '',
      className: 'w-12',
      render: (row) => (
        <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 overflow-hidden">
          {row.avatar_url ? (
            <img src={row.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            row.name.charAt(0).toUpperCase()
          )}
        </div>
      ),
    },
    { key: 'name', header: 'Ten', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    {
      key: 'role',
      header: 'Vai tro',
      render: (row) => <Badge variant={ROLE_VARIANTS[row.role] ?? 'secondary'}>{row.role}</Badge>,
    },
    {
      key: 'is_active',
      header: 'Trang thai',
      render: (row) => (
        <StatusBadge
          status={row.is_active ? 'active' : 'inactive'}
          label={row.is_active ? 'Hoat dong' : 'Khoa'}
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Ngay tham gia',
      sortable: true,
      render: (row) => formatDate(row.created_at),
    },
  ];

  const actions: ActionDef<User>[] = [
    {
      label: 'Chinh sua',
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: (row) => {
        setEditingId(row.id);
        setForm({ name: row.name, email: row.email, phone: row.phone, role: row.role, is_active: row.is_active });
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
    setForm({ name: '', email: '', password: '', phone: null, role: 'USER', is_active: true });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const result = userSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.issues.forEach((e: any) => { fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      return;
    }
    const payload = { ...result.data };
    if (editingId && !payload.password) delete (payload as Record<string, unknown>).password;
    const res = await saveMutation.mutate(payload);
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
        title="Quan ly khach hang"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Khach hang' },
        ]}
        actions={
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4 mr-2" />
            Them nguoi dung
          </Button>
        }
      />

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Vai tro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca vai tro</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="EDITOR">Editor</SelectItem>
            <SelectItem value="USER">User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        page={pagination.page}
        totalPages={totalPages}
        onPageChange={pagination.setPage}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Tim theo ten, email..."
        sort={sort}
        order={order}
        onSort={(s, o) => { setSort(s); setOrder(o); }}
        actions={actions}
      />

      {/* Dialog tao/sua user */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Chinh sua nguoi dung' : 'Them nguoi dung moi'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField label="Ho ten" error={errors.name} required>
              <Input value={form.name} onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: '' })); }} />
            </FormField>
            <FormField label="Email" error={errors.email} required>
              <Input type="email" value={form.email} onChange={(e) => { setForm((p) => ({ ...p, email: e.target.value })); setErrors((p) => ({ ...p, email: '' })); }} />
            </FormField>
            <FormField label={editingId ? 'Mat khau moi (de trong neu khong doi)' : 'Mat khau'} error={errors.password} required={!editingId}>
              <Input type="password" value={form.password ?? ''} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </FormField>
            <FormField label="So dien thoai" error={errors.phone}>
              <Input value={form.phone ?? ''} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value || null }))} />
            </FormField>
            <FormField label="Vai tro" error={errors.role} required>
              <Select value={form.role} onValueChange={(val) => setForm((p) => ({ ...p, role: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="EDITOR">Editor</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
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
        title="Xoa nguoi dung"
        description="Ban co chac chan muon xoa nguoi dung nay? Hanh dong nay khong the hoan tac."
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
