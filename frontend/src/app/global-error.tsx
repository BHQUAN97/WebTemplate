'use client';

import { useEffect } from 'react';

/**
 * Global error boundary — fallback khi root layout throw loi.
 * Phai co <html><body> vi thay the root layout.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error]', error);
  }, [error]);

  return (
    <html lang="vi">
      <body
        style={{
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
          color: '#111827',
          padding: '1rem',
        }}
      >
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            Loi nghiem trong
          </h1>
          <p
            style={{
              fontSize: '0.9rem',
              color: '#4b5563',
              marginBottom: '1.5rem',
            }}
          >
            Da co loi xay ra khi tai ung dung. Vui long thu lai sau giay lat.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: '#9ca3af',
                marginBottom: '1.5rem',
              }}
            >
              Ma loi: {error.digest}
            </p>
          )}
          <button
            onClick={() => unstable_retry()}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Thu lai
          </button>
        </div>
      </body>
    </html>
  );
}
