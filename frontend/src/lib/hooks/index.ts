'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook chong mount hydration mismatch cho zustand persist
 */
export function useHydration() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}

/**
 * Hook debounce value — dung cho search input
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook format tien VND
 */
export function useFormatPrice() {
  return useCallback((price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }, []);
}

/**
 * Format tien VND (non-hook version)
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
}

/**
 * Format ngay tieng Viet
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Tinh thoi gian doc bai viet
 */
export function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const text = content.replace(/<[^>]*>/g, '');
  const wordCount = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

/**
 * Hook media query responsive
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

/**
 * Hook click outside — dong dropdown/modal
 */
export function useClickOutside(callback: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [callback]);

  return ref;
}

/**
 * Render rating sao — tra ve mang boolean (true = filled)
 */
export function getStarArray(rating: number, max: number = 5): boolean[] {
  return Array.from({ length: max }, (_, i) => i < Math.round(rating));
}

/**
 * Map order status sang tieng Viet va mau
 */
export function getOrderStatusInfo(status: string): {
  label: string;
  color: string;
} {
  const map: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Cho xu ly', color: 'bg-yellow-100 text-yellow-800' },
    CONFIRMED: { label: 'Da xac nhan', color: 'bg-blue-100 text-blue-800' },
    PROCESSING: { label: 'Dang xu ly', color: 'bg-indigo-100 text-indigo-800' },
    SHIPPED: { label: 'Dang giao', color: 'bg-purple-100 text-purple-800' },
    DELIVERED: { label: 'Da giao', color: 'bg-green-100 text-green-800' },
    CANCELLED: { label: 'Da huy', color: 'bg-red-100 text-red-800' },
    REFUNDED: { label: 'Da hoan tien', color: 'bg-gray-100 text-gray-800' },
    RETURNED: { label: 'Da tra hang', color: 'bg-orange-100 text-orange-800' },
  };
  return map[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
}
