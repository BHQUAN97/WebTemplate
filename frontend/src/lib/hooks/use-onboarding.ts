'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Hook quan ly trang thai hoan thanh cua onboarding tour
 * Luu trang thai vao localStorage theo key truyen vao.
 * @param storageKey - Khoa localStorage duy nhat cho tour nay
 */
export function useOnboarding(storageKey: string) {
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(true);

  // Doc trang thai tu localStorage sau khi mount (tranh SSR mismatch)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      setCompleted(stored === '1' || stored === 'true');
    } catch {
      setCompleted(false);
    } finally {
      setReady(true);
    }
  }, [storageKey]);

  const markComplete = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      // ignore storage errors
    }
    setCompleted(true);
  }, [storageKey]);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore storage errors
    }
    setCompleted(false);
  }, [storageKey]);

  return {
    ready,
    shouldShow: ready && !completed,
    markComplete,
    reset,
  };
}
