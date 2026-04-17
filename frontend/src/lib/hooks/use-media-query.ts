'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Hook theo doi media query — dung useSyncExternalStore de tranh setState
 * trong useEffect (cascading render). SSR-safe: tra ve false khi server.
 * @param query - CSS media query, vd: "(min-width: 768px)"
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () =>
      typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
    [query],
  );
  const getServerSnapshot = () => false;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
