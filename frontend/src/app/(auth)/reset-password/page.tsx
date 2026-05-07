'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations';
import { authApi } from '@/lib/api/modules/auth.api';
import { ApiError } from '@/lib/api/client';

/**
 * Trang dat lai Mật khẩu — token tu URL, form new password.
 * Xu ly UX rieng khi token het han/invalid → goi y gui lai link.
 */
export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Token khong hop le');
      return;
    }
    setError('');
    setExpired(false);
    try {
      await authApi.resetPassword(token, data.password);
      setSuccess(true);
    } catch (err: any) {
      // Detect token expired/invalid — BE thuong tra 400 voi message chua tu khoa
      const status = err instanceof ApiError ? err.status : err?.status;
      const msg = (err?.message || '').toString().toLowerCase();
      const isExpired =
        status === 400 &&
        (msg.includes('expired') ||
          msg.includes('invalid') ||
          msg.includes('het han') ||
          msg.includes('khong hop le'));
      if (isExpired) {
        setExpired(true);
        return;
      }
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  if (!token || expired) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-500 mb-4">
            Link đã hết hạn. Vui lòng yêu cầu link mới.
          </p>
          <Button asChild>
            <Link href="/forgot-password">Quay về quên mật khẩu</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Đặt lại mật khẩu</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Nhập mật khẩu mới cho tài khoản của bạn
        </p>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              Đặt lại mật khẩu thành công!
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Bạn có thể đăng nhập với mật khẩu mới.
            </p>
            <Button asChild>
              <Link href="/login">Đăng nhập</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu moi
              </label>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="It nhat 8 Ký tự"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

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

            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
