'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { authApi } from '@/lib/api/modules/auth.api';

/**
 * Callback OAuth — BE redirect ve day voi ?token=... sau khi Google/Facebook OK.
 * FE lay token, fetch /users/me, setAuth, redirect ve trang chu.
 */
function CallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const token = sp.get('token');
    const error = sp.get('error');

    if (error) {
      router.replace('/login?error=oauth');
      return;
    }
    if (!token) {
      router.replace('/login');
      return;
    }

    // OAuth flow tuong duong remember=true (persistent login)
    if (typeof window !== 'undefined') {
      localStorage.setItem('remember_me', '1');
      localStorage.setItem('access_token', token);
    }

    (async () => {
      try {
        const user = await authApi.me();
        setAuth(user, token);
        router.replace('/');
      } catch {
        router.replace('/login?error=oauth');
      }
    })();
  }, [sp, router, setAuth]);

  return (
    <div className="min-h-screen grid place-items-center text-sm text-gray-500">
      Dang dang nhap...
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center text-sm text-gray-500">
          Dang dang nhap...
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
