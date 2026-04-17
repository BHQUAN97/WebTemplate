'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Error boundary cho public route group (co header + footer).
 */
export default function PublicError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[Public Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900 sm:text-3xl">
        Khong the tai trang
      </h1>
      <p className="mb-6 max-w-md text-sm text-gray-600 sm:text-base">
        Xin loi, da co loi xay ra khi tai noi dung. Ban co the thu lai.
      </p>
      {error.digest && (
        <p className="mb-6 font-mono text-xs text-gray-400">
          Ma loi: {error.digest}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => unstable_retry()}>Thu lai</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          Ve trang chu
        </Button>
      </div>
    </div>
  );
}
