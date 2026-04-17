'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Trang xac thuc 2FA — nhap 6 chu so, resend code
 */
export default function Verify2faPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer cho resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit khi nhap du 6 so
    const fullCode = newCode.join('');
    if (fullCode.length === 6) {
      handleSubmit(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);

    if (pasted.length === 6) {
      handleSubmit(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleSubmit = async (fullCode: string) => {
    if (fullCode.length !== 6) {
      setError('Vui long nhap du 6 chu so');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      // TODO: Call verify 2FA API
      // const res = await authApi.verify2fa(fullCode);
      // setAuth(res.data.user, res.data.accessToken);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Ma xac thuc khong dung');
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResendCooldown(60);
    try {
      // TODO: Call resend 2FA API
    } catch {
      // Ignore
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <ShieldCheck className="h-12 w-12 text-blue-500 mx-auto mb-2" />
        <CardTitle className="text-2xl">Xac thuc 2 lop</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Nhap ma 6 chu so tu ung dung xac thuc cua ban
        </p>
      </CardHeader>
      <CardContent>
        {/* 6 digit input */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-6" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus={index === 0}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4 text-center">
            {error}
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          disabled={submitting || code.join('').length < 6}
          onClick={() => handleSubmit(code.join(''))}
        >
          {submitting ? 'Dang xac thuc...' : 'Xac thuc'}
        </Button>

        <div className="text-center mt-4">
          {resendCooldown > 0 ? (
            <p className="text-sm text-gray-400">
              Gui lai ma sau {resendCooldown}s
            </p>
          ) : (
            <button
              onClick={handleResend}
              className="text-sm text-blue-600 hover:underline"
            >
              Gui lai ma xac thuc
            </button>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/login" className="text-blue-600 hover:underline">
            Quay lai dang nhap
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
