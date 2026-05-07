'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OAuthButtons } from '@/components/shared/oauth-buttons';
import { registerSchema, type RegisterFormData } from '@/lib/validations';
import { authApi } from '@/lib/api/modules/auth.api';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils';

/**
 * Trang Đăng ký — form, password strength, terms checkbox
 */
export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { terms: false },
  });

  const password = watch('password', '');

  // Tinh do manh Mật khẩu
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const levels = [
      { label: '', color: '' },
      { label: 'Yếu', color: 'bg-red-500' },
      { label: 'Trung bình', color: 'bg-orange-500' },
      { label: 'Khá', color: 'bg-yellow-500' },
      { label: 'Mạnh', color: 'bg-green-500' },
      { label: 'Rất mạnh', color: 'bg-green-600' },
    ];
    return { score, ...levels[score] };
  }, [password]);

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    try {
      const res = await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setAuth(res.user, res.accessToken);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại, vui lòng thử lại');
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Đăng ký</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Tạo tài khoản mới để bắt đầu mua sắm
        </p>
      </CardHeader>
      <CardContent>
        {/* OAuth providers — Google / Facebook / Apple */}
        <OAuthButtons mode="register" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Họ tên
            </label>
            <Input
              {...register('name')}
              placeholder="Nhập họ tên"
              autoComplete="name"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              {...register('email')}
              type="email"
              placeholder="email@example.com"
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="8+ ký tự, hoa/thường/số/đặc biệt"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-label={showPassword ? 'An' : 'Hien'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}

            {/* Password strength */}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1.5 flex-1 rounded-full',
                        i < passwordStrength.score
                          ? passwordStrength.color
                          : 'bg-gray-200',
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Xác nhận Mật khẩu
            </label>
            <Input
              {...register('confirmPassword')}
              type="password"
              placeholder="Nháp lai Mật khẩu"
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              {...register('terms')}
              className="rounded border-gray-300 mt-0.5"
            />
            <span className="text-sm text-gray-600">
              Tôi đồng ý với{' '}
              <Link href="/dieu-khoan" className="text-blue-600 hover:underline">
                Điều khoản sử dụng
              </Link>{' '}
              va{' '}
              <Link href="/chinh-sach" className="text-blue-600 hover:underline">
                Chính sách bảo mật
              </Link>
            </span>
          </label>
          {errors.terms && (
            <p className="text-red-500 text-xs">{errors.terms.message}</p>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Đang xử lý...' : 'Đăng ký'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Đăng nhập
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
