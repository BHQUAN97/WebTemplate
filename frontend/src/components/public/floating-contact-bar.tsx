'use client';

import { useEffect, useState } from 'react';
import { Phone, Mail, MessageCircle, ArrowUp } from 'lucide-react';
import { useCtaSettings } from '@/lib/hooks/use-cta-settings';

/**
 * Floating contact bar — stack doc goc duoi phai.
 * Lay config tu settings.public (cta.*). An hoan toan neu khong bat cai nao.
 * Safe area bottom cho iOS, tranh che bottom tab bar tren mobile.
 */
export function FloatingContactBar() {
  const cta = useCtaSettings();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    if (!cta.backToTop) return;
    const onScroll = () => setShowTop(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [cta.backToTop]);

  const zaloHref = cta.zalo.phone
    ? `https://zalo.me/${cta.zalo.phone.replace(/\D/g, '')}`
    : '';
  const waDigits = cta.whatsapp.number.replace(/\D/g, '');
  const waHref = waDigits ? `https://wa.me/${waDigits}` : '';

  const hasAny =
    cta.zalo.enabled ||
    cta.messenger.enabled ||
    cta.phone.enabled ||
    cta.whatsapp.enabled ||
    cta.email.enabled ||
    (cta.backToTop && showTop);

  if (!hasAny) return null;

  return (
    <div
      className="fixed right-3 z-40 flex flex-col gap-2 print:hidden"
      style={{
        // Stack tren bottom tab bar (h-14 = 56px) + safe area iOS
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
      }}
    >
      {cta.zalo.enabled && zaloHref && (
        <a
          href={zaloHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat Zalo"
          className="h-12 w-12 rounded-full bg-[#0068ff] text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
        >
          <span className="font-bold text-xs tracking-tight">Zalo</span>
        </a>
      )}

      {cta.messenger.enabled && cta.messenger.url && (
        <a
          href={cta.messenger.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Nhan tin Messenger"
          className="h-12 w-12 rounded-full bg-gradient-to-br from-[#00B2FF] to-[#006AFF] text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}

      {cta.whatsapp.enabled && waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat WhatsApp"
          className="h-12 w-12 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      )}

      {cta.phone.enabled && cta.phone.number && (
        <a
          href={`tel:${cta.phone.number.replace(/\s/g, '')}`}
          aria-label={`Goi ${cta.phone.number}`}
          className="h-12 w-12 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95 animate-pulse"
        >
          <Phone className="h-5 w-5" />
        </a>
      )}

      {cta.email.enabled && cta.email.address && (
        <a
          href={`mailto:${cta.email.address}`}
          aria-label="Gui email"
          className="h-12 w-12 rounded-full bg-gray-700 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
        >
          <Mail className="h-5 w-5" />
        </a>
      )}

      {cta.backToTop && showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Cuon len dau trang"
          className="h-12 w-12 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
