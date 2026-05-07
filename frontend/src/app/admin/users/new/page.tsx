'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useMutation } from '@/lib/hooks/use-api';

const userSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(8, 'Mật khẩu tối thiểu 8 ký tự')
    .regex(/[A-Z]/, 'Cần ít nhất 1 chữ hoa')
    .regex(/[0-9]/, 'Cần ít nhất 1 số')
    .regex(/[^a-zA-Z0-9]/, 'Cần ít nhất 1 ký tự đặc biệt'),
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(100, 'Tối đa 100 ký tự'),
  phone: z
    .string()
    .regex(/^0\d{9,10}$/, 'Số điện thoại không hợp lệ')
    .optional()
    .or(z.literal('')),
  role: z.enum(['ADMIN', 'MANAGER', 'EDITOR', 'USER']),
  is_active: z.boolean(),
});

type UserForm = z.infer<typeof userSchema>;

/** Tạo người dùng moi */
export default function NewUserPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<UserForm>({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'USER',
    is_active: true,
  });

  const createMutation = useMutation('POST', '/admin/users');

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
    const res = await createMutation.mutate(payload);
    if (res) router.push('/admin/users');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo người dùng moi"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Người dùng', href: '/admin/users' },
          { label: 'Tạo mới' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Thông tin tài khoản</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Email" error={errors.email} required>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="user@example.com"
                />
              </FormField>
              <FormField label="Mật khẩu" error={errors.password} required description="Tối thiểu 8 ký tự, gồm chữ hoa, số, ký tự đặc biệt">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                />
              </FormField>
              <FormField label="Họ tên" error={errors.name} required>
                <Input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </FormField>
              <FormField label="Số điện thoại" error={errors.phone}>
                <Input
                  value={form.phone ?? ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="0912345678"
                />
              </FormField>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Phân quyền</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Vai trò" error={errors.role} required>
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
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Kích hoạt</span>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(c) => updateField('is_active', c)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button className="w-full" disabled={createMutation.loading} onClick={handleSubmit}>
              <UserPlus className="h-4 w-4 mr-2" />
              {createMutation.loading ? 'Đang tạo...' : 'Tạo người dùng'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/admin/users')}>
              Huy
            </Button>
          </div>

          {createMutation.error && (
            <p className="text-sm text-red-500">{createMutation.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
