'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const STORAGE_KEY = 'cookie-consent-v1';

/** Kieu du lieu consent luu vao localStorage. */
export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  timestamp: number;
}

type ConsentCategory = 'analytics' | 'marketing' | 'preferences';

/**
 * Translation helper an toan — fallback khi namespace 'cookies' chua co trong messages.
 */
function useSafeT(namespace: string) {
  let t: ((key: string) => string) | null = null;
  try {
    t = useTranslations(namespace);
  } catch {
    t = null;
  }
  return (key: string, fallback: string): string => {
    if (!t) return fallback;
    try {
      const v = t(key);
      if (!v || v === `${namespace}.${key}`) return fallback;
      return v;
    } catch {
      return fallback;
    }
  };
}

/** Doc consent hien tai tu localStorage. Tra ve null neu chua co / loi parse. */
function readConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (typeof parsed !== 'object' || parsed === null) return null;
    return { ...parsed, necessary: true };
  } catch {
    return null;
  }
}

/** Ghi consent xuong localStorage va phat event 'cookie-consent-change'. */
function writeConsent(consent: CookieConsent) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    window.dispatchEvent(
      new CustomEvent<CookieConsent>('cookie-consent-change', { detail: consent }),
    );
  } catch {
    /* quota / private mode — bo qua */
  }
}

/**
 * Hook tra ve consent hien tai + setter. Dong bo giua cac tab qua 'storage' event
 * va cung page qua custom event 'cookie-consent-change'.
 */
export function useCookieConsent() {
  const [consent, setConsentState] = useState<CookieConsent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConsentState(readConsent());
    setReady(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setConsentState(readConsent());
    };
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<CookieConsent>).detail;
      if (detail) setConsentState(detail);
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('cookie-consent-change', onLocal as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cookie-consent-change', onLocal as EventListener);
    };
  }, []);

  const setConsent = useCallback(
    (next: Omit<CookieConsent, 'necessary' | 'timestamp'>) => {
      const full: CookieConsent = {
        necessary: true,
        analytics: !!next.analytics,
        marketing: !!next.marketing,
        preferences: !!next.preferences,
        timestamp: Date.now(),
      };
      writeConsent(full);
      setConsentState(full);
    },
    [],
  );

  const clearConsent = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
    setConsentState(null);
    window.dispatchEvent(new CustomEvent('cookie-consent-change'));
  }, []);

  return { consent, setConsent, clearConsent, ready };
}

/**
 * Banner xin consent cookie — hien fixed bottom-0, slide-up animation.
 * - An neu da co consent trong localStorage
 * - 3 nut: "Chap nhan tat ca" / "Chi can thiet" / "Tuy chinh" (mo dialog)
 * - Dialog tuy chinh: 4 toggles (necessary disabled always-on + 3 loai khac)
 */
export function CookieConsent() {
  const t = useSafeT('cookies');
  const { consent, setConsent, ready } = useCookieConsent();

  const [showBanner, setShowBanner] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // State tam cho dialog tuy chinh — khoi tao tu consent cu neu co
  const [prefs, setPrefs] = useState<Record<ConsentCategory, boolean>>({
    analytics: false,
    marketing: false,
    preferences: false,
  });

  // Delay nhe de tao hieu ung slide-up khi mount
  useEffect(() => {
    if (!ready) return;
    if (consent) {
      setShowBanner(false);
      return;
    }
    const timer = window.setTimeout(() => setShowBanner(true), 50);
    return () => window.clearTimeout(timer);
  }, [ready, consent]);

  // Mo dialog thi copy consent hien tai vao state tam
  useEffect(() => {
    if (customizeOpen) {
      setPrefs({
        analytics: consent?.analytics ?? false,
        marketing: consent?.marketing ?? false,
        preferences: consent?.preferences ?? false,
      });
    }
  }, [customizeOpen, consent]);

  const handleAcceptAll = () => {
    setConsent({ analytics: true, marketing: true, preferences: true });
    setShowBanner(false);
  };

  const handleNecessaryOnly = () => {
    setConsent({ analytics: false, marketing: false, preferences: false });
    setShowBanner(false);
  };

  const handleSavePrefs = () => {
    setConsent(prefs);
    setCustomizeOpen(false);
    setShowBanner(false);
  };

  if (!ready || consent) return null;

  return (
    <>
      <div
        role="dialog"
        aria-live="polite"
        aria-label={t('title', 'Cài đặt cookie')}
        className={[
          'fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white shadow-2xl',
          'transition-transform duration-300 ease-out',
          showBanner ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="flex-1 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">
              {t('title', 'Chúng tôi tôn trọng quyền riêng tư của bạn')}
            </p>
            <p className="mt-1 text-gray-600">
              {t(
                'description',
                'Chúng tôi sử dụng cookies để cải thiện trải nghiệm của bạn, phân tích lưu lượng và cá nhân hoá nội dung.',
              )}{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                {t('privacyLink', 'Chính sách bảo mật')}
              </Link>{' '}
              ·{' '}
              <Link href="/cookies" className="text-blue-600 hover:underline">
                {t('cookieLink', 'Chính sách cookie')}
              </Link>
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:flex-nowrap md:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCustomizeOpen(true)}
            >
              {t('customize', 'Tùy chỉnh')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNecessaryOnly}
            >
              {t('necessaryOnly', 'Chỉ cần thiết')}
            </Button>
            <Button type="button" size="sm" onClick={handleAcceptAll}>
              {t('acceptAll', 'Chấp nhận tất cả')}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog tuy chinh chi tiet */}
      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('customize', 'Tùy chỉnh cookie')}</DialogTitle>
            <DialogDescription>
              {t(
                'customizeDescription',
                'Chọn loại cookie bạn muốn cho phép. Cookie cần thiết luôn được bật để trang hoạt động đúng.',
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Necessary — always on */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3">
              <div className="flex-1">
                <Label className="text-sm font-medium">
                  {t('necessary', 'Cần thiết')}
                </Label>
                <p className="mt-1 text-xs text-gray-500">
                  {t(
                    'necessaryDesc',
                    'Bắt buộc để trang hoạt động: đăng nhập, giỏ hàng, bảo mật.',
                  )}
                </p>
              </div>
              <Switch checked disabled aria-label={t('necessary', 'Cần thiết')} />
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3">
              <div className="flex-1">
                <Label htmlFor="cc-analytics" className="text-sm font-medium">
                  {t('analytics', 'Phân tích')}
                </Label>
                <p className="mt-1 text-xs text-gray-500">
                  {t(
                    'analyticsDesc',
                    'Giúp chúng tôi hiểu cách bạn sử dụng trang để cải thiện.',
                  )}
                </p>
              </div>
              <Switch
                id="cc-analytics"
                checked={prefs.analytics}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
                aria-label={t('analytics', 'Phân tích')}
              />
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3">
              <div className="flex-1">
                <Label htmlFor="cc-marketing" className="text-sm font-medium">
                  {t('marketing', 'Tiếp thị')}
                </Label>
                <p className="mt-1 text-xs text-gray-500">
                  {t(
                    'marketingDesc',
                    'Hiển thị quảng cáo và nội dung phù hợp với bạn.',
                  )}
                </p>
              </div>
              <Switch
                id="cc-marketing"
                checked={prefs.marketing}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
                aria-label={t('marketing', 'Tiếp thị')}
              />
            </div>

            {/* Preferences */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3">
              <div className="flex-1">
                <Label htmlFor="cc-preferences" className="text-sm font-medium">
                  {t('preferences', 'Tuỳ chọn')}
                </Label>
                <p className="mt-1 text-xs text-gray-500">
                  {t(
                    'preferencesDesc',
                    'Nhớ lựa chọn của bạn (ngôn ngữ, giao diện, khu vực).',
                  )}
                </p>
              </div>
              <Switch
                id="cc-preferences"
                checked={prefs.preferences}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, preferences: v }))}
                aria-label={t('preferences', 'Tuỳ chọn')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomizeOpen(false)}
            >
              {t('cancel', 'Huỷ')}
            </Button>
            <Button type="button" onClick={handleSavePrefs}>
              {t('savePrefs', 'Lưu lựa chọn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CookieConsent;
