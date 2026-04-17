'use client';

import { useState, useEffect } from 'react';

/**
 * Hook tra ve gia tri debounced — chi cap nhat sau khi user ngung thay doi
 * @param value - Gia tri can debounce
 * @param delay - Thoi gian delay (ms), default 300ms
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
