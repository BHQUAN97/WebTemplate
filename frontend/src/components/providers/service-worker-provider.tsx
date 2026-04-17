'use client';

import { useEffect } from 'react';
import { toast } from '@/lib/hooks/use-toast';

/**
 * ServiceWorkerProvider — dang ky /sw.js khi production + lang nghe controllerchange
 * de thong bao co update moi.
 *
 * - Chi register o production (NODE_ENV === 'production') de tranh conflict voi HMR dev.
 * - Khi SW moi active + take control -> event 'controllerchange' fire -> thong bao reload.
 */
export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    let cancelled = false;

    // Register SW sau khi page load de khong block render
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        if (cancelled) return;

        // Khi co waiting SW moi -> prompt user apply update
        if (registration.waiting) {
          notifyUpdate(registration);
        }

        // Theo doi updatefound -> prompt khi SW moi cai xong
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (
              installing.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              notifyUpdate(registration);
            }
          });
        });
      } catch (err) {
        // Silent fail — SW khong phai tinh nang critical
        // eslint-disable-next-line no-console
        console.warn('[SW] Register failed:', err);
      }
    };

    // Khi SW moi take control -> reload de apply version moi
    const onControllerChange = () => {
      // Tranh loop vo han khi dev tool force update
      if ((window as unknown as { __swRefreshing?: boolean }).__swRefreshing) return;
      (window as unknown as { __swRefreshing?: boolean }).__swRefreshing = true;
      toast(
        'Có cập nhật mới',
        'Reload để áp dụng phiên bản mới nhất.',
        'default',
      );
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onControllerChange,
      );
    };
  }, []);

  return <>{children}</>;
}

/**
 * Hien toast thong bao co update + tu dong apply sau khi user xac nhan
 * (dang hien tai: chi show toast, user tu reload). Giu tach ham de de mo rong sau.
 */
function notifyUpdate(registration: ServiceWorkerRegistration) {
  toast('Có cập nhật mới', 'Reload để áp dụng phiên bản mới nhất.', 'default');
  // Neu muon auto-apply khi user reload -> cho SW skipWaiting
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

export default ServiceWorkerProvider;
