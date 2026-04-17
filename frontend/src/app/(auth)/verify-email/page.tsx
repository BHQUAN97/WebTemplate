'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/modules/auth.api';

type Status = 'loading' | 'ok' | 'error';

/**
 * Trang xac thuc email — user click link trong email → /verify-email?token=xxx
 * Auto-verify khi mount. 3 trang thai: loading | ok | error.
 */
function VerifyEmailInner() {
  const sp = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  // Ref de guard React StrictMode double-fire trong dev
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const token = sp.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Thieu token xac thuc');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setStatus('ok'))
      .catch((err: any) => {
        setStatus('error');
        setMessage(
          err?.message || 'Token khong hop le hoac da het han',
        );
      });
  }, [sp]);

  const handleResend = async () => {
    const email = sp.get('email');
    if (!email) {
      setMessage('Vui long dang nhap de gui lai email xac thuc');
      return;
    }
    setResending(true);
    try {
      await authApi.resendVerificationEmail(email);
      setResent(true);
    } catch (err: any) {
      setMessage(err?.message || 'Gui lai email that bai');
    } finally {
      setResending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Xac thuc email</CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'loading' && (
          <div className="text-center py-8">
            <Loader2 className="h-10 w-10 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-sm text-gray-500">
              Dang xac thuc email cua ban...
            </p>
          </div>
        )}

        {status === 'ok' && (
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              Xac thuc thanh cong!
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Email cua ban da duoc xac thuc. Ban co the dang nhap de bat dau
              su dung.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Dang nhap</Link>
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-4">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              Xac thuc that bai
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {message || 'Link xac thuc khong hop le hoac da het han.'}
            </p>

            {resent ? (
              <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3 mb-4 flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                Da gui lai email xac thuc
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full mb-2"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? 'Dang gui...' : 'Gui lai email xac thuc'}
              </Button>
            )}

            <Button variant="ghost" asChild className="w-full">
              <Link href="/login">Quay lai dang nhap</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-10 w-10 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-sm text-gray-500">Dang tai...</p>
          </CardContent>
        </Card>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
