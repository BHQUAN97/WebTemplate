'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations';
import { authApi } from '@/lib/api/modules/auth.api';

const RESEND_COOLDOWN_SEC = 60;

/**
 * Trang quen mat khau — nhap email, gui link reset + cooldown resend 60s
 */
export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  // Cooldown countdown cho button resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError('');
    try {
      await authApi.forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setSubmitted(true);
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (err: any) {
      setError(err.message || 'Co loi xay ra, vui long thu lai');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !submittedEmail) return;
    setError('');
    try {
      await authApi.forgotPassword(submittedEmail);
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (err: any) {
      setError(err.message || 'Co loi xay ra, vui long thu lai');
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Quen mat khau</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Nhap email de nhan link dat lai mat khau
        </p>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="text-center py-4">
            <Mail className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Kiem tra email</h3>
            <p className="text-sm text-gray-500 mb-6">
              Chung toi da gui link dat lai mat khau den{' '}
              <span className="font-medium text-gray-700">{submittedEmail}</span>.
              Vui long kiem tra hop thu (ke ca thu muc spam).
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={cooldown > 0}
              >
                {cooldown > 0
                  ? `Gui lai sau ${cooldown}s`
                  : 'Gui lai email'}
              </Button>
              <Button variant="ghost" asChild className="w-full">
                <Link href="/login">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Quay lai dang nhap
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              {isSubmitting ? 'Dang gui...' : 'Gui email'}
            </Button>

            <p className="text-center">
              <Link
                href="/login"
                className="text-sm text-blue-600 hover:underline"
              >
                <ArrowLeft className="h-3 w-3 inline mr-1" />
                Quay lai dang nhap
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
