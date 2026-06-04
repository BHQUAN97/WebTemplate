'use client';

import { useScrollReveal, staggerDelay } from '@/lib/hooks/use-scroll-reveal';
import { useCounter } from '@/lib/hooks/use-counter';
import { siteConfig } from '@/config/site.config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatItem {
  end: number;
  suffix: string;
  label: string;
  duration?: number;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const stats: StatItem[] = [
  { end: 500, suffix: '+', label: 'Dự án hoàn thành', duration: 2000 },
  { end: 10, suffix: '+', label: 'Năm kinh nghiệm', duration: 1500 },
  { end: 98, suffix: '%', label: 'Khách hàng hài lòng', duration: 2200 },
  { end: 50, suffix: '+', label: 'Đối tác tin cậy', duration: 1800 },
];

// ─── Sub-component: single stat counter ──────────────────────────────────────

function StatCounter({
  item,
  index,
  isVisible,
}: {
  item: StatItem;
  index: number;
  isVisible: boolean;
}) {
  const { ref, count } = useCounter({ end: item.end, duration: item.duration ?? 2000 });
  const delay = staggerDelay(index, 120);

  return (
    <div
      className="flex flex-col items-center gap-2 text-center"
      style={{
        transition: `opacity 0.6s ease ${delay}, transform 0.6s ease ${delay}`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
      }}
    >
      {/* Số counter lớn */}
      <div className="flex items-end justify-center gap-0.5 leading-none">
        <span
          ref={ref as React.RefObject<HTMLSpanElement>}
          className="text-5xl sm:text-6xl font-extrabold tabular-nums text-white"
          aria-live="polite"
          aria-atomic="true"
        >
          {count}
        </span>
        <span className="mb-1 text-3xl sm:text-4xl font-bold text-amber-400" aria-hidden="true">
          {item.suffix}
        </span>
      </div>

      {/* Label */}
      <p className="text-sm sm:text-base font-medium text-gray-300 tracking-wide">
        {item.label}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * StatsSection — Số liệu thành tích với counter animation.
 * Dark background, 4 stats ngang trên desktop, 2×2 trên mobile.
 * Dùng useCounter (đếm lên khi vào viewport) + useScrollReveal (fade-in stagger).
 */
export function StatsSection() {
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0.2 });

  return (
    <section
      id="stats"
      className="relative overflow-hidden bg-gray-900 py-20"
      aria-labelledby="stats-heading"
    >
      {/* Decorative dot-grid pattern */}
      <span
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Gradient glow trên cùng */}
      <span
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[600px] rounded-full bg-blue-600/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header — ẩn thị theo scroll */}
        <div
          ref={sectionRef as React.RefObject<HTMLDivElement>}
          className="text-center mb-14"
          style={{
            transition: 'opacity 0.6s ease, transform 0.6s ease',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-amber-400 mb-4 tracking-wide uppercase">
            Con số nói lên tất cả
          </span>
          <h2
            id="stats-heading"
            className="text-3xl sm:text-4xl font-bold text-white leading-tight"
          >
            {siteConfig.name} — Hành trình{' '}
            <span className="text-amber-400">10 năm</span> tin cậy
          </h2>
          <p className="mt-3 text-gray-400 text-base max-w-xl mx-auto leading-relaxed">
            Những con số minh chứng cho cam kết chất lượng và sự tin tưởng mà
            khách hàng đặt vào chúng tôi.
          </p>
        </div>

        {/* Stats grid — 2×2 mobile, 4 cột desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          {stats.map((item, idx) => (
            <StatCounter key={item.label} item={item} index={idx} isVisible={isVisible} />
          ))}
        </div>

        {/* Divider trang trí bên dưới */}
        <div className="mt-16 flex items-center gap-4" aria-hidden="true">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-gray-600 tracking-widest uppercase">
            {siteConfig.name}
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
      </div>
    </section>
  );
}
