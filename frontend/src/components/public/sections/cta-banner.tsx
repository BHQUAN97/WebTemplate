'use client';

import { Phone } from 'lucide-react';
import { siteConfig } from '@/config/site.config';
import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * CTABanner — Banner kêu gọi hành động cuối trang.
 * Background gradient primary → secondary (lấy từ siteConfig.theme).
 * Hiển thị phone + Zalo nếu siteConfig.contact có giá trị.
 */
export function CTABanner() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
  const { contact, theme } = siteConfig;

  const zaloDigits = contact.zalo ? contact.zalo.replace(/\D/g, '') : '';
  const zaloHref   = zaloDigits ? `https://zalo.me/${zaloDigits}` : '';

  return (
    <section
      className="relative overflow-hidden py-20"
      style={{
        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
      }}
      aria-label="Liên hệ ngay"
    >
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-20 bg-white"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full blur-3xl opacity-20 bg-white"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full blur-3xl opacity-10 bg-white"
      />

      {/* Content */}
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className={`relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Badge */}
        <span className="inline-block mb-4 px-4 py-1 rounded-full bg-white/15 text-white/90 text-xs font-semibold tracking-widest uppercase">
          Bắt đầu ngay hôm nay
        </span>

        {/* Heading */}
        <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
          Sẵn sàng đưa doanh nghiệp
          <br className="hidden sm:block" />
          <span className="text-white/90"> lên tầm cao mới?</span>
        </h2>

        {/* Sub-text */}
        <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
          Liên hệ với chúng tôi ngay hôm nay để được tư vấn miễn phí và nhận báo giá
          phù hợp với nhu cầu của bạn.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
          {/* Primary CTA */}
          <a
            href={contact.phone ? `tel:${contact.phone}` : '#lien-he'}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-gray-900 font-semibold text-base hover:bg-gray-100 active:scale-95 transition-all duration-200 shadow-lg min-h-[44px]"
          >
            <Phone className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Liên hệ tư vấn
          </a>

          {/* Secondary CTA */}
          <a
            href="#dich-vu"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/40 text-white font-semibold text-base hover:bg-white/10 active:scale-95 transition-all duration-200 min-h-[44px]"
          >
            Xem dịch vụ
          </a>
        </div>

        {/* Vietnam-specific contact info */}
        {(contact.phone || zaloHref) && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-white/80 text-sm flex-wrap">
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-1.5 hover:text-white transition-colors font-medium"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                <span>Gọi ngay:</span>
                <span className="font-bold text-white">
                  {contact.phoneDisplay || contact.phone}
                </span>
              </a>
            )}

            {contact.phone && zaloHref && (
              <span className="hidden sm:inline text-white/40" aria-hidden="true">
                |
              </span>
            )}

            {zaloHref && contact.zalo && (
              <a
                href={zaloHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-white transition-colors font-medium"
              >
                {/* Zalo icon — inline SVG vì không có trong lucide */}
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#0068ff] text-white font-bold"
                  style={{ fontSize: '7px', lineHeight: 1 }}
                  aria-hidden="true"
                >
                  Z
                </span>
                <span>Zalo:</span>
                <span className="font-bold text-white">{contact.zalo}</span>
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
