'use client';

import Link from 'next/link';
import {
  Layers,
  Hammer,
  Shield,
  BarChart,
  CheckCircle,
  Headphones,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { useScrollReveal, staggerDelay } from '@/lib/hooks/use-scroll-reveal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceItem {
  icon: LucideIcon;
  title: string;
  description: string;
  featured?: boolean;
  href?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const services: ServiceItem[] = [
  {
    icon: Layers,
    title: 'Tư vấn & Thiết kế',
    description:
      'Đội ngũ chuyên gia giàu kinh nghiệm sẽ tư vấn giải pháp tối ưu và thiết kế phương án phù hợp nhất với nhu cầu của bạn.',
    featured: true,
    href: '/services/consulting',
  },
  {
    icon: Hammer,
    title: 'Thi công & Lắp đặt',
    description:
      'Thi công chuyên nghiệp, đúng tiến độ với vật liệu chất lượng cao và đội ngũ kỹ thuật lành nghề.',
    href: '/services/construction',
  },
  {
    icon: Shield,
    title: 'Bảo hành & Bảo trì',
    description:
      'Chính sách bảo hành rõ ràng, dịch vụ bảo trì định kỳ giúp công trình luôn trong trạng thái tốt nhất.',
    href: '/services/warranty',
  },
  {
    icon: BarChart,
    title: 'Quản lý dự án',
    description:
      'Theo dõi tiến độ minh bạch, kiểm soát chi phí chặt chẽ và báo cáo định kỳ cho chủ đầu tư.',
    href: '/services/management',
  },
  {
    icon: CheckCircle,
    title: 'Giám sát chất lượng',
    description:
      'Quy trình kiểm tra nghiêm ngặt tại mọi giai đoạn, đảm bảo tiêu chuẩn kỹ thuật và an toàn.',
    href: '/services/quality',
  },
  {
    icon: Headphones,
    title: 'Hỗ trợ 24/7',
    description:
      'Đội ngũ hỗ trợ luôn sẵn sàng xử lý mọi sự cố nhanh chóng, đảm bảo hoạt động liên tục.',
    href: '/services/support',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Card dịch vụ thông thường */
function ServiceCard({
  item,
  index,
  isVisible,
}: {
  item: ServiceItem;
  index: number;
  isVisible: boolean;
}) {
  const Icon = item.icon;
  const delay = staggerDelay(index, 80);

  return (
    <div
      className={[
        'group relative flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6',
        'hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default',
        'opacity-0 translate-y-6',
        isVisible ? 'animate-fade-in-up' : '',
      ].join(' ')}
      style={{
        animationDelay: isVisible ? delay : undefined,
        animationFillMode: 'forwards',
        opacity: isVisible ? undefined : 0,
        transform: isVisible ? undefined : 'translateY(24px)',
        transition: `opacity 0.5s ease ${delay}, transform 0.5s ease ${delay}`,
        // Override khi visible — dùng inline transition thay vì keyframe
        ...(isVisible && {
          opacity: 1,
          transform: 'translateY(0)',
        }),
      }}
    >
      {/* Icon */}
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>

      {/* Content */}
      <div className="flex flex-col gap-2 flex-1">
        <h3 className="text-base font-semibold text-gray-900 leading-snug">{item.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
      </div>

      {/* Arrow link */}
      {item.href && (
        <Link
          href={item.href}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:gap-2 transition-all mt-auto"
          aria-label={`Xem thêm về ${item.title}`}
        >
          Tìm hiểu thêm
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/** Card dịch vụ nổi bật (featured) — col-span-2, row-span-2 trên desktop */
function FeaturedServiceCard({
  item,
  isVisible,
}: {
  item: ServiceItem;
  isVisible: boolean;
}) {
  const Icon = item.icon;

  return (
    <div
      className={[
        'group relative flex flex-col gap-6 rounded-2xl p-8 md:col-span-2 md:row-span-2',
        'bg-gradient-to-br from-blue-600 to-blue-800 text-white',
        'hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-default',
      ].join(' ')}
      style={{
        transition: `opacity 0.6s ease 0ms, transform 0.6s ease 0ms`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
      }}
    >
      {/* Decorative background circle */}
      <span
        className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/5"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-12 -left-6 h-64 w-64 rounded-full bg-white/5"
        aria-hidden="true"
      />

      {/* Icon lớn hơn */}
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </span>

      {/* Badge */}
      <span className="absolute right-6 top-6 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-amber-900">
        Nổi bật
      </span>

      {/* Content */}
      <div className="flex flex-col gap-3 flex-1">
        <h3 className="text-2xl font-bold leading-tight">{item.title}</h3>
        <p className="text-blue-100 leading-relaxed text-base">{item.description}</p>

        {/* Điểm nổi bật */}
        <ul className="mt-2 space-y-2">
          {['Phân tích nhu cầu chuyên sâu', 'Đội ngũ 10+ năm kinh nghiệm', 'Báo giá minh bạch, nhanh chóng'].map(
            (point) => (
              <li key={point} className="flex items-center gap-2 text-sm text-blue-100">
                <CheckCircle className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                {point}
              </li>
            ),
          )}
        </ul>
      </div>

      {/* Arrow link */}
      {item.href && (
        <Link
          href={item.href}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:gap-3 transition-all mt-auto w-fit"
          aria-label={`Xem thêm về ${item.title}`}
        >
          Khám phá dịch vụ
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * ServicesSection — Bento Grid layout cho section dịch vụ trang landing.
 * Desktop: 4 col grid, card featured chiếm col-span-2 row-span-2.
 * Mobile: 1 cột, tất cả bằng nhau.
 */
export function ServicesSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal({ threshold: 0.2 });
  const { ref: gridRef, isVisible: gridVisible } = useScrollReveal({ threshold: 0.1 });

  const featuredItem = services.find((s) => s.featured)!;
  const regularItems = services.filter((s) => !s.featured);

  return (
    <section
      id="services"
      className="py-20 bg-gray-50"
      aria-labelledby="services-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header — scroll reveal */}
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="text-center mb-14"
          style={{
            transition: 'opacity 0.6s ease, transform 0.6s ease',
            opacity: headerVisible ? 1 : 0,
            transform: headerVisible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <span className="inline-block rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700 mb-4">
            Dịch vụ của chúng tôi
          </span>
          <h2
            id="services-heading"
            className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight"
          >
            Giải pháp toàn diện
            <br className="hidden sm:block" />
            <span className="text-blue-600"> cho mọi dự án</span>
          </h2>
          <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Từ tư vấn đến thi công, từ giám sát đến bảo trì — chúng tôi đồng hành
            cùng bạn trong toàn bộ vòng đời dự án.
          </p>
        </div>

        {/* Bento Grid */}
        <div
          ref={gridRef as React.RefObject<HTMLDivElement>}
          className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4"
        >
          {/* Card featured — col-span-2 row-span-2 */}
          <FeaturedServiceCard item={featuredItem} isVisible={gridVisible} />

          {/* 5 cards thông thường — mỗi card 1 ô trong grid 2x2 bên phải */}
          {regularItems.map((item, idx) => (
            <ServiceCard
              key={item.title}
              item={item}
              index={idx + 1}
              isVisible={gridVisible}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
