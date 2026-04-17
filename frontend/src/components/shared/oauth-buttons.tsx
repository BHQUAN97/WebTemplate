'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Provider = 'google' | 'facebook' | 'apple';
type Mode = 'login' | 'register';

interface OAuthButtonsProps {
  mode?: Mode;
  className?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Safe translation helper — tra ve fallback neu next-intl throw (missing key).
 * Cho phep component hoat dong ngay ca khi messages chua co namespace auth.oauth.
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
      // next-intl tra ve "namespace.key" neu khong tim thay
      if (!v || v === `${namespace}.${key}`) return fallback;
      return v;
    } catch {
      return fallback;
    }
  };
}

/**
 * Inline SVG brand icons — tranh phu thuoc lucide-react cho logo thuong hieu.
 */
function GoogleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function FacebookIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="#1877F2"
      aria-hidden="true"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function AppleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

const PROVIDERS: { id: Provider; Icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'google', Icon: GoogleIcon, label: 'Google' },
  { id: 'facebook', Icon: FacebookIcon, label: 'Facebook' },
  { id: 'apple', Icon: AppleIcon, label: 'Apple' },
];

/**
 * Nhom 3 nut OAuth (Google / Facebook / Apple) dung cho login va register.
 * - Click redirect sang BE: {API_URL}/api/auth/oauth/{provider}
 * - Loading state khi user click de tranh double-click
 * - Co divider "hoac tiep tuc voi" o tren
 */
export function OAuthButtons({ mode = 'login', className }: OAuthButtonsProps) {
  const t = useSafeT('auth.oauth');
  const [loading, setLoading] = useState<Provider | null>(null);
  const disabled = !API_URL;

  const handleClick = (provider: Provider) => {
    if (disabled || loading) return;
    setLoading(provider);
    // Redirect toan trang — state loading giu den khi browser roi khoi page
    window.location.href = `${API_URL}/api/auth/oauth/${provider}`;
  };

  const divider = t('divider', 'or continue with');
  const loadingText = t('loading', 'Đang chuyển hướng...');
  const verbPrefix = mode === 'register' ? 'Đăng ký với' : 'Đăng nhập với';

  return (
    <div className={className}>
      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-gray-400">{divider}</span>
        </div>
      </div>

      {/* Provider buttons */}
      <div className="space-y-2">
        {PROVIDERS.map(({ id, Icon, label }) => {
          const providerLabel = t(id, label);
          const ariaLabel = `${verbPrefix} ${providerLabel}`;
          const isLoading = loading === id;
          return (
            <Button
              key={id}
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleClick(id)}
              disabled={disabled || !!loading}
              aria-label={ariaLabel}
              title={disabled ? 'OAuth chưa cấu hình' : undefined}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <Icon className="h-4 w-4 mr-2" />
              )}
              <span>{isLoading ? loadingText : `${verbPrefix} ${providerLabel}`}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default OAuthButtons;
