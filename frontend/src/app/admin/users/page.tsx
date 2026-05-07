'use client';

import { useState } from 'react';
import { UserPlus, Pencil, Power, PowerOff, Eye } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type ColumnDef, type ActionDef } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { usePagination } from '@/lib/hooks/use-pagination';
import { formatDate } from '@/lib/utils/format';
import type { ApiResponse, User } from '@/lib/types';

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  ADMIN: 'destructive',
  MANAGER: 'warning',
  EDITOR: 'default',
  USER: 'secondary',
};

/** Quản lý Người dùng (admin) */
export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [toggleUser, setToggleUser] = useState<User | null>(null);

  const pagination = usePagination();

  const params: Record<string, string | number | boolean | undefined> = {
    page: pagination.page,
    limit: pagination.limit,
    search: search || undefined,
    sort,
    order,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    is_active: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { data, loading, refetch } = useApi<ApiResponse<User[]>>('/admin/users', params);
  const users = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const toggleMutation = useMutation<{ is_active: boolean }, User>(
    'PATCH',
    toggleUser ? `/admin/users/${toggleUser.id}` : '',
  );

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
            row.name?.charAt(0).toUpperCase() ?? '?'
          )}
        </div>
      ),
    },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'name', header: 'Họ tên', sortable: true },
    {
      key: 'role',
      header: 'Vai trò',
      render: (row) => <Badge variant={ROLE_VARIANTS[row.role] ?? 'secondary'}>{row.role}</Badge>,
    },
    {
      key: 'is_active',
      header: 'Trạng thái',
      render: (row) => (
        <StatusBadge
          status={row.is_active ? 'active' : 'inactive'}
          label={row.is_active ? 'Hoạt động' : 'Đã khóa'}
        />
      ),
    },
    {
      key: 'two_factor_enabled',
      header: '2FA',
      render: (row) => (
        <Badge variant={row.two_factor_enabled ? 'success' : 'secondary'}>
          {row.two_factor_enabled ? 'Bật' : 'Tắt'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Ngày tạo',
      sortable: true,
      render: (row) => formatDate(row.created_at),
    },
  ];

  const actions: ActionDef<User>[] = [
    {
      label: 'Xem chi tiết',
      icon: <Eye className="h-4 w-4 mr-2" />,
      onClick: (row) => { window.location.href = `/admin/users/${row.id}`; },
    },
    {
      label: 'Chỉnh sửa',
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: (row) => { window.location.href = `/admin/users/${row.id}`; },
    },
    {
      label: 'Kích hoạt / Vô hiệu',
      icon: <PowerOff className="h-4 w-4 mr-2" />,
      onClick: (row) => setToggleUser(row),
    },
  ];

  const handleToggle = async () => {
    if (!toggleUser) return;
    await toggleMutation.mutate({ is_active: !toggleUser.is_active });
    setToggleUser(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Người dùng"
        description="Danh sách tất cả Người dùng Hệ thống"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Người dùng' },
        ]}
        actions={
          <Button asChild>
            <a href="/admin/users/new">
              <UserPlus className="h-4 w-4 mr-2" />
              Tạo người dùng
            </a>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả vai trò</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="EDITOR">Editor</SelectItem>
            <SelectItem value="USER">User</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="true">Hoạt động</SelectItem>
            <SelectItem value="false">Đã khóa</SelectItem>
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
        searchPlaceholder="Tìm theo email, tên..."
        sort={sort}
        order={order}
        onSort={(s, o) => { setSort(s); setOrder(o); }}
        actions={actions}
      />

      <ConfirmDialog
        open={!!toggleUser}
        onOpenChange={(open) => !open && setToggleUser(null)}
        title={toggleUser?.is_active ? 'Vô hiệu hóa Người dùng' : 'Kích hoạt Người dùng'}
        description={
          toggleUser?.is_active
            ? `Người dùng ${toggleUser?.email} sẽ không thể Đăng nhập. Tiếp tục?`
            : `Kích hoạt lại ${toggleUser?.email}?`
        }
        onConfirm={handleToggle}
        confirmLabel={toggleUser?.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
        variant={toggleUser?.is_active ? 'danger' : 'info'}
        loading={toggleMutation.loading}
      />
    </div>
  );
}
