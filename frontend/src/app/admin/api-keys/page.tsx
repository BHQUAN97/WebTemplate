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
  name: z.string().min(2, 'Ten toi thieu 2 ky tu').max(100),
  scopes: z.array(z.string()).min(1, 'Chon it nhat 1 quyen'),
  expires_at: z.string().optional().nullable(),
});

type CreateForm = z.infer<typeof createSchema>;

/** Quan ly API Keys */
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
    { key: 'name', header: 'Ten' },
    {
      key: 'prefix',
      header: 'Key',
      render: (row) => <span className="font-mono text-xs">{row.prefix}...</span>,
    },
    {
      key: 'scopes',
      header: 'Quyen',
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
      header: 'Trang thai',
      render: (row) => (
        <StatusBadge
          status={row.is_active ? 'active' : 'inactive'}
          label={row.is_active ? 'Hoat dong' : 'Da thu hoi'}
        />
      ),
    },
    {
      key: 'expires_at',
      header: 'Het han',
      render: (row) => (row.expires_at ? formatDate(row.expires_at) : 'Vinh vien'),
    },
    {
      key: 'last_used_at',
      header: 'Dung cuoi',
      render: (row) => (row.last_used_at ? formatDate(row.last_used_at) : 'Chua'),
    },
  ];

  const actions: ActionDef<ApiKey>[] = [
    {
      label: 'Thu hoi',
      icon: <Ban className="h-4 w-4 mr-2" />,
      onClick: (row) => setRevokeId(row.id),
      hidden: (row) => !row.is_active,
    },
    {
      label: 'Tao lai',
      icon: <RefreshCw className="h-4 w-4 mr-2" />,
      onClick: (row) => setRegenerateId(row.id),
    },
    {
      label: 'Xoa',
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
      toast('Da copy', undefined, 'success');
    } catch {
      toast('Copy that bai', undefined, 'destructive');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description="Quan ly token de goi API tu app ben ngoai"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'API Keys' },
        ]}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tao API key
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
        searchPlaceholder="Tim theo ten..."
        actions={actions}
      />

      {/* Dialog tao key moi */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tao API key moi</DialogTitle>
            <DialogDescription>Key chi hien thi 1 lan sau khi tao — hay luu lai ngay</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField label="Ten" error={errors.name} required>
              <Input
                value={form.name}
                onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: '' })); }}
                placeholder="VD: Production backend"
              />
            </FormField>
            <FormField label="Quyen (scopes)" error={errors.scopes} required>
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
            <FormField label="Ngay het han" description="De trong = khong het han">
              <Input
                type="date"
                value={form.expires_at ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Huy</Button>
            <Button onClick={handleCreate} disabled={createMutation.loading}>
              <KeyRound className="h-4 w-4 mr-2" />
              {createMutation.loading ? 'Dang tao...' : 'Tao key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog hien thi key moi tao */}
      <Dialog open={!!showKey} onOpenChange={(o) => !o && setShowKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API key da duoc tao</DialogTitle>
            <DialogDescription>
              <strong>Luu y:</strong> Key chi hien thi 1 lan. Copy va luu lai ngay bay gio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
              Neu mat key, ban phai tao lai (regenerate) de co key moi.
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
              <Check className="h-4 w-4 mr-2" /> Da luu key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!revokeId}
        onOpenChange={(o) => !o && setRevokeId(null)}
        title="Thu hoi API key"
        description="Key se bi vo hieu hoa ngay lap tuc. Tiep tuc?"
        onConfirm={handleRevoke}
        confirmLabel="Thu hoi"
        variant="danger"
        loading={revokeMutation.loading}
      />

      <ConfirmDialog
        open={!!regenerateId}
        onOpenChange={(o) => !o && setRegenerateId(null)}
        title="Tao lai API key"
        description="Key cu se bi vo hieu. Key moi chi hien thi 1 lan."
        onConfirm={handleRegenerate}
        confirmLabel="Tao lai"
        variant="warning"
        loading={regenerateMutation.loading}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xoa API key"
        description="Xoa vinh vien key nay?"
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
