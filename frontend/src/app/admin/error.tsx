'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Error boundary cho admin — giu sidebar/topbar layout.
 */
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[Admin Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900 sm:text-3xl">
        Loi he thong quan tri
      </h1>
      <p className="mb-6 max-w-md text-sm text-gray-600 sm:text-base">
        Da co loi xay ra khi tai trang quan tri. Kiem tra console de biet chi
        tiet, hoac thu lai.
      </p>
      {error.digest && (
        <p className="mb-6 font-mono text-xs text-gray-400">
          Ma loi: {error.digest}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => unstable_retry()}>Thu lai</Button>
        <Button
          variant="outline"
          onClick={() => (window.location.href = '/admin')}
        >
          Ve dashboard
        </Button>
      </div>
    </div>
  );
}
