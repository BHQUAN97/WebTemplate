'use client';

import { useState, useEffect } from 'react';
import { Phone, Mail, MessageCircle, MapPin, X, Headphones } from 'lucide-react';
import { useCtaSettings } from '@/lib/hooks/use-cta-settings';
import { siteConfig } from '@/config/site.config';

interface FabAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  className: string;
  external?: boolean;
}

/**
 * Speed Dial FAB — mobile-first collapsible contact button.
 * Tap để expand/collapse danh sách liên hệ với cascade animation.
 * Desktop: tự động expand khi hover vào vùng FAB.
 */
export function SpeedDialFab() {
  const cta = useCtaSettings();
  const [open, setOpen] = useState(false);
  const configPhone = siteConfig.contact.phone;
  const configZalo = siteConfig.contact.zalo;
  const zaloHref = configZalo ? `https://zalo.me/${configZalo.replace(/\D/g, '')}` : '';

  // Đóng khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  const actions: FabAction[] = [
    ...(zaloHref
      ? [{
          label: 'Zalo',
          href: zaloHref,
          icon: <span className="font-bold text-xs tracking-tight">Zalo</span>,
          className: 'bg-[#0068ff]',
          external: true,
        }]
      : []),
    ...(cta.messenger.enabled && cta.messenger.url
      ? [{
          label: 'Messenger',
          href: cta.messenger.url,
          icon: <MessageCircle className="h-5 w-5" />,
          className: 'bg-gradient-to-br from-[#00B2FF] to-[#006AFF]',
          external: true,
        }]
      : []),
    ...(configPhone
      ? [{
          label: 'Gọi ngay',
          href: `tel:${configPhone.replace(/\s/g, '')}`,
          icon: <Phone className="h-5 w-5" />,
          className: 'bg-green-600',
        }]
      : []),
    ...(cta.email.enabled && cta.email.address
      ? [{
          label: 'Email',
          href: `mailto:${cta.email.address}`,
          icon: <Mail className="h-5 w-5" />,
          className: 'bg-gray-700',
        }]
      : []),
    {
      label: 'Liên hệ',
      href: '/contact',
      icon: <MapPin className="h-5 w-5" />,
      className: 'bg-violet-600',
    },
  ];

  if (actions.length === 0) return null;

  return (
    <div
      className="fixed right-3 z-40 flex flex-col-reverse items-end gap-2 print:hidden"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Action buttons — cascade in/out */}
      {actions.map((action, i) => (
        <a
          key={action.label}
          href={action.href}
          target={action.external ? '_blank' : undefined}
          rel={action.external ? 'noopener noreferrer' : undefined}
          aria-label={action.label}
          style={{
            transitionDelay: open ? `${i * 40}ms` : `${(actions.length - 1 - i) * 30}ms`,
          }}
          className={[
            'h-11 w-11 rounded-full text-white shadow-lg flex items-center justify-center',
            'transition-all duration-200',
            action.className,
            open
              ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
              : 'opacity-0 translate-y-4 scale-75 pointer-events-none',
          ].join(' ')}
        >
          {action.icon}
        </a>
      ))}

      {/* Main FAB trigger */}
      <button
        type="button"
        aria-label={open ? 'Đóng liên hệ' : 'Liên hệ nhanh'}
        onClick={() => setOpen((v) => !v)}
        className={[
          'h-14 w-14 rounded-full text-white shadow-xl flex items-center justify-center',
          'transition-all duration-200 active:scale-90',
          open ? 'bg-gray-800 rotate-45' : 'bg-primary animate-pulse',
        ].join(' ')}
      >
        {open ? <X className="h-6 w-6" /> : <Headphones className="h-6 w-6" />}
      </button>
    </div>
  );
}
