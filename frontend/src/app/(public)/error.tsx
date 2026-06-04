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
        Không thể tải trang
      </h1>
      <p className="mb-6 max-w-md text-sm text-gray-600 sm:text-base">
        Xin lỗi, đã có lỗi khi tải nội dung. Bạn có thể thử lại.
      </p>
      {error.digest && (
        <p className="mb-6 font-mono text-xs text-gray-400">
          Mã lỗi: {error.digest}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => unstable_retry()}>Thử lại</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          Về Trang chủ
        </Button>
      </div>
    </div>
  );
}
