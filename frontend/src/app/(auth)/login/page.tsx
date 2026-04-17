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
import { OAuthButtons } from '@/components/shared/oauth-buttons';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { authApi } from '@/lib/api/modules/auth.api';
import { useAuthStore } from '@/lib/stores/auth-store';

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
  // Chong open redirect: chi chap nhan path same-origin bat dau bang '/'
  // va khong phai '//' hay '/\' (protocol-relative).
  const safeRedirect = (() => {
    const r = searchParams.get('redirect');
    if (!r || !r.startsWith('/') || r.startsWith('//') || r.startsWith('/\\')) {
      return '/';
    }
    return r;
  })();
  const redirectAfter = safeRedirect;

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

        {/* OAuth providers — Google / Facebook / Apple */}
        <OAuthButtons mode="login" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
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
