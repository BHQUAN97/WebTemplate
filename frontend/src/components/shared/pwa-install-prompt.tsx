'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * PWA Install Prompt — hien banner goi user cai dat app.
 *
 * Luong:
 *   - Chrome/Edge/Android: lang nghe event 'beforeinstallprompt' -> hien banner -> user
 *     bam "Cai dat" -> goi deferredPrompt.prompt()
 *   - iOS Safari: khong co beforeinstallprompt, hien hint "Share -> Them vao man hinh chinh"
 *   - Da cai (display-mode: standalone) -> khong hien
 *   - User bam "De sau" -> luu timestamp vao localStorage, an trong 7 ngay
 */

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngay

// Event 'beforeinstallprompt' chua co trong lib.dom chuan — khai bao local
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia('(display-mode: standalone)').matches;
  // iOS Safari: navigator.standalone
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mq || iosStandalone;
}

function isIos(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isIosDevice = /iPad|iPhone|iPod/.test(ua);
  const isIpadOS =
    ua.includes('Macintosh') &&
    'ontouchend' in document &&
    navigator.maxTouchPoints > 1;
  return isIosDevice || isIpadOS;
}

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function markDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* quota / private mode — bo qua */
  }
}

export function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) return;
    if (isDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      // Chan browser auto-show -> tu kiem soat UI
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari khong fire beforeinstallprompt -> hien hint sau 1.5s neu chua dismiss
    if (isIos()) {
      const timer = window.setTimeout(() => {
        if (!isStandalone() && !isDismissed()) {
          setIosHint(true);
          setVisible(true);
        }
      }, 1500);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener(
          'beforeinstallprompt',
          onBeforeInstall as EventListener,
        );
        window.removeEventListener('appinstalled', onInstalled);
      };
    }

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        onBeforeInstall as EventListener,
      );
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Trigger slide-up animation sau khi mount
  useEffect(() => {
    if (!visible) {
      setEntered(false);
      return;
    }
    const t = window.setTimeout(() => setEntered(true), 50);
    return () => window.clearTimeout(t);
  }, [visible]);

  const handleInstall = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'dismissed') {
        markDismissed();
      }
    } catch {
      /* user abort / browser reject — bo qua */
    } finally {
      setDeferred(null);
      setVisible(false);
    }
  }, [deferred]);

  const handleDismiss = useCallback(() => {
    markDismissed();
    setEntered(false);
    // Cho animation ket thuc truoc khi unmount
    window.setTimeout(() => setVisible(false), 250);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cài đặt ứng dụng"
      className={[
        'fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-4 sm:pb-4',
        'transition-transform duration-300 ease-out',
        entered ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
    >
      <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1 text-sm">
            <p className="font-semibold text-gray-900 dark:text-gray-50">
              Cài đặt app để truy cập nhanh hơn
            </p>
            {iosHint ? (
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Nhấn <span aria-hidden="true">⎋</span> Share → <b>Thêm vào màn hình chính</b>
              </p>
            ) : (
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Trải nghiệm toàn màn hình, offline-ready.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
            >
              Để sau
            </Button>
            {!iosHint && (
              <Button type="button" size="sm" onClick={handleInstall}>
                Cài đặt
              </Button>
            )}
            {iosHint && (
              <Button type="button" size="sm" onClick={handleDismiss}>
                Đã hiểu
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PWAInstallPrompt;
