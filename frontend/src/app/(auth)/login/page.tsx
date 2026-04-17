'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { authApi } from '@/lib/api/modules/auth.api';
import { useAuthStore } from '@/lib/stores/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Trang dang nhap — email/password, remember me, OAuth Google/Facebook
 * Xu ly 2FA: neu BE tra TWO_FACTOR_REQUIRED → luu context vao sessionStorage
 * va chuyen sang /verify-2fa.
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Error tu OAuth callback (query ?error=oauth)
  const oauthError = searchParams.get('error');
  const redirectAfter = searchParams.get('redirect');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    try {
      // Ghi remember_me flag truoc khi goi login de client biet dung storage nao
      if (typeof window !== 'undefined') {
        localStorage.setItem('remember_me', data.remember ? '1' : '0');
      }

      const res = await authApi.login({
        email: data.email,
        password: data.password,
        remember: data.remember,
      });
      setAuth(res.user, res.accessToken);
      router.push(redirectAfter || '/');
    } catch (err: any) {
      // BE tra TWO_FACTOR_REQUIRED → chuyen sang verify-2fa, giu context
      const code = err?.details?.code || err?.code;
      if (code === 'TWO_FACTOR_REQUIRED') {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            '2fa_pending',
            JSON.stringify({
              email: data.email,
              password: data.password,
              remember: !!data.remember,
              redirect: redirectAfter || '/',
            }),
          );
        }
        router.push('/verify-2fa');
        return;
      }
      setError(err.message || 'Email hoac mat khau khong dung');
    }
  };

  // OAuth handlers — chuyen huong sang BE de khoi dong OAuth flow
  const oauthEnabled = !!API_URL;
  const handleGoogle = () => {
    if (!oauthEnabled) return;
    window.location.href = `${API_URL}/auth/google`;
  };
  const handleFacebook = () => {
    if (!oauthEnabled) return;
    window.location.href = `${API_URL}/auth/facebook`;
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Dang nhap</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Chao mung ban quay tro lai
        </p>
      </CardHeader>
      <CardContent>
        {oauthError === 'oauth' && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
            Dang nhap OAuth that bai. Vui long thu lai.
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              Mat khau
            </label>
            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhap mat khau"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'An mat khau' : 'Hien mat khau'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register('remember')}
                className="rounded border-gray-300"
              />
              Ghi nho dang nhap
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:underline"
            >
              Quen mat khau?
            </Link>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Dang xu ly...' : 'Dang nhap'}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400">hoac</span>
          </div>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={handleGoogle}
            disabled={!oauthEnabled}
            title={!oauthEnabled ? 'OAuth chua cau hinh' : undefined}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Dang nhap voi Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={handleFacebook}
            disabled={!oauthEnabled}
            title={!oauthEnabled ? 'OAuth chua cau hinh' : undefined}
          >
            <svg className="h-4 w-4 mr-2" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Dang nhap voi Facebook
          </Button>
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Chua co tai khoan?{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Dang ky ngay
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
