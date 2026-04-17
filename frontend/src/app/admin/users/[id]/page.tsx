'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, KeyRound, ShieldOff, LogOut, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { FormField } from '@/components/shared/form-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { formatDate } from '@/lib/utils/format';
import type { ApiResponse, User, AccessLog } from '@/lib/types';

const userSchema = z.object({
  name: z.string().min(2, 'Ten toi thieu 2 ky tu').max(100, 'Toi da 100 ky tu'),
  phone: z
    .string()
    .regex(/^0\d{9,10}$/, 'So dien thoai khong hop le')
    .optional()
    .or(z.literal('')),
  role: z.enum(['ADMIN', 'MANAGER', 'EDITOR', 'USER']),
  is_active: z.boolean(),
  is_email_verified: z.boolean(),
  avatar_url: z.string().url('URL khong hop le').optional().or(z.literal('')),
});

type UserForm = z.infer<typeof userSchema>;

/** Chi tiet / Chinh sua nguoi dung */
export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<
    null | 'reset' | 'disable2fa' | 'revokeSessions' | 'delete'
  >(null);
  const [form, setForm] = useState<UserForm>({
    name: '',
    phone: '',
    role: 'USER',
    is_active: true,
    is_email_verified: false,
    avatar_url: '',
  });

  const { data, loading } = useApi<ApiResponse<User>>(`/admin/users/${id}`);
  const logs = useApi<ApiResponse<AccessLog[]>>(`/admin/logs/access`, {
    user_id: id,
    limit: 10,
  });

  const updateMutation = useMutation('PATCH', `/admin/users/${id}`);
  const resetPwMutation = useMutation('POST', `/admin/users/${id}/reset-password`);
  const disable2faMutation = useMutation('POST', `/admin/users/${id}/disable-2fa`);
  const revokeSessionsMutation = useMutation('POST', `/admin/users/${id}/revoke-sessions`);
  const deleteMutation = useMutation('DELETE', `/admin/users/${id}`);

  useEffect(() => {
    if (data?.data) {
      const u = data.data;
      setForm({
        name: u.name ?? '',
        phone: u.phone ?? '',
        role: u.role,
        is_active: u.is_active,
        is_email_verified: u.is_email_verified,
        avatar_url: u.avatar_url ?? '',
      });
    }
  }, [data]);

  const user = data?.data;

  const updateField = <K extends keyof UserForm>(key: K, value: UserForm[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: '' }));
  };

  const handleSubmit = async () => {
    const result = userSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.issues.forEach((e: any) => {
        fe[e.path[0] as string] = e.message;
      });
      setErrors(fe);
      return;
    }
    const payload = { ...result.data };
    if (!payload.phone) delete (payload as Record<string, unknown>).phone;
    if (!payload.avatar_url) delete (payload as Record<string, unknown>).avatar_url;
    await updateMutation.mutate(payload);
  };

  const handleConfirm = async () => {
    switch (confirm) {
      case 'reset':
        await resetPwMutation.mutate();
        break;
      case 'disable2fa':
        await disable2faMutation.mutate();
        break;
      case 'revokeSessions':
        await revokeSessionsMutation.mutate();
        break;
      case 'delete':
        {
          const res = await deleteMutation.mutate();
          if (res !== null) router.push('/admin/users');
        }
        break;
    }
    setConfirm(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={user?.email ?? 'Nguoi dung'}
        description={user?.name}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Nguoi dung', href: '/admin/users' },
          { label: user?.email ?? 'Chi tiet' },
        ]}
        actions={
          <Button variant="destructive" onClick={() => setConfirm('delete')}>
            <Trash2 className="h-4 w-4 mr-2" /> Xoa
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form chinh */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Thong tin co ban</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Email">
                <Input value={user?.email ?? ''} disabled readOnly />
              </FormField>
              <FormField label="Ho ten" error={errors.name} required>
                <Input value={form.name} onChange={(e) => updateField('name', e.target.value)} />
              </FormField>
              <FormField label="So dien thoai" error={errors.phone}>
                <Input
                  value={form.phone ?? ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="0912345678"
                />
              </FormField>
              <FormField label="Avatar URL" error={errors.avatar_url}>
                <Input
                  value={form.avatar_url ?? ''}
                  onChange={(e) => updateField('avatar_url', e.target.value)}
                  placeholder="https://..."
                />
              </FormField>
              <FormField label="Vai tro" error={errors.role} required>
                <Select value={form.role} onValueChange={(v) => updateField('role', v as UserForm['role'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="EDITOR">Editor</SelectItem>
                    <SelectItem value="USER">User</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium">Kich hoat</span>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(c) => updateField('is_active', c)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Da xac thuc email</span>
                <Switch
                  checked={form.is_email_verified}
                  onCheckedChange={(c) => updateField('is_email_verified', c)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Bao mat */}
          <Card>
            <CardHeader><CardTitle>Bao mat</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Reset mat khau</p>
                  <p className="text-xs text-gray-500">Gui email cho phep nguoi dung dat lai mat khau</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setConfirm('reset')}>
                  <KeyRound className="h-4 w-4 mr-2" /> Reset
                </Button>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Xac thuc hai buoc (2FA)</p>
                  <p className="text-xs text-gray-500">
                    Trang thai: {user?.two_factor_enabled ? 'Dang bat' : 'Dang tat'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!user?.two_factor_enabled}
                  onClick={() => setConfirm('disable2fa')}
                >
                  <ShieldOff className="h-4 w-4 mr-2" /> Tat 2FA
                </Button>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Phien dang nhap</p>
                  <p className="text-xs text-gray-500">Vo hieu hoa tat ca phien dang nhap cua user nay</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setConfirm('revokeSessions')}>
                  <LogOut className="h-4 w-4 mr-2" /> Revoke
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audit log */}
          <Card>
            <CardHeader><CardTitle>Lich su truy cap (10 gan nhat)</CardTitle></CardHeader>
            <CardContent>
              {logs.loading ? (
                <Skeleton className="h-32" />
              ) : logs.data?.data?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-500 border-b">
                      <tr>
                        <th className="py-2">Thoi gian</th>
                        <th>Method</th>
                        <th>Path</th>
                        <th>IP</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.data.data.map((l) => (
                        <tr key={l.id} className="border-b last:border-0">
                          <td className="py-2">{formatDate(l.created_at)}</td>
                          <td><Badge variant="secondary">{l.method}</Badge></td>
                          <td className="font-mono text-xs">{l.path}</td>
                          <td className="text-gray-500">{l.ip_address}</td>
                          <td>
                            <Badge variant={l.status_code < 400 ? 'success' : 'destructive'}>
                              {l.status_code}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Chua co log</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Tong quan</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Ngay tao</span>
                <span>{user?.created_at ? formatDate(user.created_at) : '---'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ID</span>
                <span className="font-mono text-xs">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">2FA</span>
                <Badge variant={user?.two_factor_enabled ? 'success' : 'secondary'}>
                  {user?.two_factor_enabled ? 'Bat' : 'Tat'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button className="w-full" disabled={updateMutation.loading} onClick={handleSubmit}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.loading ? 'Dang luu...' : 'Luu thay doi'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/admin/users')}>
              Huy
            </Button>
          </div>

          {updateMutation.error && (
            <p className="text-sm text-red-500">{updateMutation.error}</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm === 'reset' ? 'Reset mat khau'
          : confirm === 'disable2fa' ? 'Tat 2FA'
          : confirm === 'revokeSessions' ? 'Vo hieu hoa cac phien'
          : 'Xoa nguoi dung'
        }
        description={
          confirm === 'reset' ? `Gui email reset mat khau cho ${user?.email}?`
          : confirm === 'disable2fa' ? `Tat xac thuc hai buoc cho ${user?.email}?`
          : confirm === 'revokeSessions' ? `Vo hieu hoa tat ca phien cua ${user?.email}?`
          : `Xoa vinh vien nguoi dung ${user?.email}? Hanh dong nay khong the hoan tac.`
        }
        onConfirm={handleConfirm}
        confirmLabel={confirm === 'delete' ? 'Xoa vinh vien' : 'Xac nhan'}
        variant={confirm === 'delete' || confirm === 'disable2fa' ? 'danger' : 'info'}
        loading={
          resetPwMutation.loading ||
          disable2faMutation.loading ||
          revokeSessionsMutation.loading ||
          deleteMutation.loading
        }
      />
    </div>
  );
}
