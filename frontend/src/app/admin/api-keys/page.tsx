'use client';

import { useState } from 'react';
import { Plus, KeyRound, Ban, RefreshCw, Trash2, Copy, Check } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type ColumnDef, type ActionDef } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { usePagination } from '@/lib/hooks/use-pagination';
import { useToast } from '@/lib/hooks/use-toast';
import { formatDate } from '@/lib/utils/format';
import type { ApiResponse } from '@/lib/types';
import type { ApiKey, CreateApiKeyResponse } from '@/lib/api/modules/api-keys.api';

const AVAILABLE_SCOPES = [
  'read:users',
  'write:users',
  'read:products',
  'write:products',
  'read:orders',
  'write:orders',
  'read:analytics',
  'admin:all',
];

const createSchema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(100),
  scopes: z.array(z.string()).min(1, 'Chọn ít nhất 1 quyền'),
  expires_at: z.string().optional().nullable(),
});

type CreateForm = z.infer<typeof createSchema>;

/** Quản lý API Keys */
export default function ApiKeysPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [regenerateId, setRegenerateId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [showKey, setShowKey] = useState<{ key: string; name: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<CreateForm>({
    name: '',
    scopes: [],
    expires_at: '',
  });

  const pagination = usePagination();

  const params: Record<string, string | number | boolean | undefined> = {
    page: pagination.page,
    limit: pagination.limit,
    search: search || undefined,
  };

  const { data, loading, refetch } = useApi<ApiResponse<ApiKey[]>>(
    '/admin/api-keys',
    params,
  );
  const keys = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const createMutation = useMutation<CreateForm, CreateApiKeyResponse>(
    'POST',
    '/admin/api-keys',
  );
  const revokeMutation = useMutation(
    'POST',
    revokeId ? `/admin/api-keys/${revokeId}/revoke` : '',
  );
  const regenerateMutation = useMutation<unknown, CreateApiKeyResponse>(
    'POST',
    regenerateId ? `/admin/api-keys/${regenerateId}/regenerate` : '',
  );
  const deleteMutation = useMutation('DELETE', deleteId ? `/admin/api-keys/${deleteId}` : '');

  const columns: ColumnDef<ApiKey>[] = [
    { key: 'name', header: 'Tên' },
    {
      key: 'prefix',
      header: 'Key',
      render: (row) => <span className="font-mono text-xs">{row.prefix}...</span>,
    },
    {
      key: 'scopes',
      header: 'Quyền',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.scopes?.slice(0, 2).map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
          ))}
          {row.scopes && row.scopes.length > 2 && (
            <Badge variant="secondary" className="text-xs">+{row.scopes.length - 2}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Trạng thái',
      render: (row) => (
        <StatusBadge
          status={row.is_active ? 'active' : 'inactive'}
          label={row.is_active ? 'Hoạt động' : 'Đã thu hồi'}
        />
      ),
    },
    {
      key: 'expires_at',
      header: 'Hết hạn',
      render: (row) => (row.expires_at ? formatDate(row.expires_at) : 'Vĩnh viễn'),
    },
    {
      key: 'last_used_at',
      header: 'Dùng cuối',
      render: (row) => (row.last_used_at ? formatDate(row.last_used_at) : 'Chưa'),
    },
  ];

  const actions: ActionDef<ApiKey>[] = [
    {
      label: 'Thu hồi',
      icon: <Ban className="h-4 w-4 mr-2" />,
      onClick: (row) => setRevokeId(row.id),
      hidden: (row) => !row.is_active,
    },
    {
      label: 'Tạo lại',
      icon: <RefreshCw className="h-4 w-4 mr-2" />,
      onClick: (row) => setRegenerateId(row.id),
    },
    {
      label: 'Xóa',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      variant: 'destructive',
      onClick: (row) => setDeleteId(row.id),
    },
  ];

  const toggleScope = (scope: string) => {
    setForm((p) => ({
      ...p,
      scopes: p.scopes.includes(scope) ? p.scopes.filter((s) => s !== scope) : [...p.scopes, scope],
    }));
    setErrors((p) => ({ ...p, scopes: '' }));
  };

  const handleCreate = async () => {
    const result = createSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.issues.forEach((e: any) => {
        fe[e.path[0] as string] = e.message;
      });
      setErrors(fe);
      return;
    }
    const payload = { ...result.data };
    if (!payload.expires_at) delete (payload as Record<string, unknown>).expires_at;
    const res = await createMutation.mutate(payload);
    if (res?.key) {
      setCreateOpen(false);
      setShowKey({ key: res.key, name: res.api_key?.name ?? form.name });
      setForm({ name: '', scopes: [], expires_at: '' });
      refetch();
    }
  };

  const handleRevoke = async () => {
    await revokeMutation.mutate();
    setRevokeId(null);
    refetch();
  };

  const handleRegenerate = async () => {
    const res = await regenerateMutation.mutate();
    setRegenerateId(null);
    refetch();
    if (res?.key) {
      setShowKey({ key: res.key, name: res.api_key?.name ?? '' });
    }
  };

  const handleDelete = async () => {
    await deleteMutation.mutate();
    setDeleteId(null);
    refetch();
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Đã copy', undefined, 'success');
    } catch {
      toast('Copy Thất bại', undefined, 'destructive');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description="Quản lý token để gọi API từ app bên ngoài"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'API Keys' },
        ]}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo API key
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={keys}
        loading={loading}
        page={pagination.page}
        totalPages={totalPages}
        onPageChange={pagination.setPage}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Tìm theo tên..."
        actions={actions}
      />

      {/* Dialog tao key moi */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo API key mới</DialogTitle>
            <DialogDescription>Key chỉ hiển thị 1 lần sau khi tạo — hãy lưu lại ngay</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField label="Tên" error={errors.name} required>
              <Input
                value={form.name}
                onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: '' })); }}
                placeholder="VD: Production backend"
              />
            </FormField>
            <FormField label="Quyền (scopes)" error={errors.scopes} required>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_SCOPES.map((sc) => (
                  <label key={sc} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.scopes.includes(sc)}
                      onCheckedChange={() => toggleScope(sc)}
                    />
                    <span className="font-mono text-xs">{sc}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <FormField label="Ngày hết hạn" description="Để trống = không hết hạn">
              <Input
                type="date"
                value={form.expires_at ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} disabled={createMutation.loading}>
              <KeyRound className="h-4 w-4 mr-2" />
              {createMutation.loading ? 'Đang tạo...' : 'Tạo key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog hien thi key moi tao */}
      <Dialog open={!!showKey} onOpenChange={(o) => !o && setShowKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API key đã được tạo</DialogTitle>
            <DialogDescription>
              <strong>Lưu ý:</strong> Key chỉ hiển thị 1 lần. Copy và lưu lại ngay bây giờ.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
              Nếu mất key, bạn phải tạo lại (regenerate) để có key mới.
            </div>
            <div className="font-mono text-xs bg-gray-100 p-3 rounded break-all">
              {showKey?.key}
            </div>
            <Button className="w-full" onClick={() => showKey && handleCopy(showKey.key)}>
              <Copy className="h-4 w-4 mr-2" /> Copy key
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowKey(null)}>
              <Check className="h-4 w-4 mr-2" /> Đã lưu key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!revokeId}
        onOpenChange={(o) => !o && setRevokeId(null)}
        title="Thu hồi API key"
        description="Key sẽ bị vô hiệu hóa ngay lập tức. Tiếp tục?"
        onConfirm={handleRevoke}
        confirmLabel="Thu hồi"
        variant="danger"
        loading={revokeMutation.loading}
      />

      <ConfirmDialog
        open={!!regenerateId}
        onOpenChange={(o) => !o && setRegenerateId(null)}
        title="Tạo lại API key"
        description="Key cũ sẽ bị vô hiệu. Key mới chỉ hiển thị 1 lần."
        onConfirm={handleRegenerate}
        confirmLabel="Tạo lại"
        variant="warning"
        loading={regenerateMutation.loading}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa API key"
        description="Xóa vĩnh viễn key này?"
        onConfirm={handleDelete}
        confirmLabel="Xóa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
