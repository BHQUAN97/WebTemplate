'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Testimonial {
  id: number;
  name: string;
  title: string;
  quote: string;
  /** Màu nền avatar (Tailwind bg class) */
  avatarColor: string;
  /** Chữ viết tắt hiển thị trong avatar */
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: 'Nguyễn Văn Minh',
    title: 'Giám đốc — Công ty Xây dựng Minh Phát',
    quote:
      'Dịch vụ chuyên nghiệp, đội ngũ hỗ trợ nhiệt tình. Từ khi hợp tác, doanh thu của chúng tôi tăng rõ rệt. Rất hài lòng với chất lượng và tiến độ bàn giao.',
    avatarColor: 'bg-blue-500',
    initials: 'NM',
  },
  {
    id: 2,
    name: 'Trần Thị Lan',
    title: 'Chủ cửa hàng — Nội thất Hoà Phát',
    quote:
      'Giải pháp phù hợp với nhu cầu của shop nhỏ mà không tốn quá nhiều chi phí. Giao diện đẹp, dễ dùng, khách hàng phản hồi rất tích cực.',
    avatarColor: 'bg-pink-500',
    initials: 'TL',
  },
  {
    id: 3,
    name: 'Lê Quang Huy',
    title: 'Trưởng phòng Kinh doanh — Tập đoàn ABC',
    quote:
      'Hệ thống ổn định, tích hợp nhanh với quy trình hiện có. Đội ngũ kỹ thuật xử lý vấn đề rất nhanh, không ảnh hưởng đến hoạt động kinh doanh.',
    avatarColor: 'bg-green-600',
    initials: 'LH',
  },
  {
    id: 4,
    name: 'Phạm Thu Hương',
    title: 'CEO — Công ty Thiết kế XYZ',
    quote:
      'Đã thử qua nhiều giải pháp nhưng đây là lựa chọn tốt nhất. Tính năng đầy đủ, thiết kế tinh tế, phù hợp với hình ảnh thương hiệu của chúng tôi.',
    avatarColor: 'bg-purple-500',
    initials: 'PH',
  },
  {
    id: 5,
    name: 'Đỗ Văn Thành',
    title: 'Giám đốc Kỹ thuật — Nhà máy DEF',
    quote:
      'Tích hợp dễ dàng, tài liệu đầy đủ. Chỉ mất 2 ngày để đội kỹ thuật của chúng tôi triển khai xong toàn bộ hệ thống. Tiết kiệm rất nhiều thời gian.',
    avatarColor: 'bg-orange-500',
    initials: 'DT',
  },
];

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} sao`}>
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className="h-4 w-4 fill-amber-400 text-amber-400"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <div className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] px-3">
      <div className="h-full bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col gap-4">
        {/* Rating */}
        <StarRating />

        {/* Quote */}
        <p className="italic text-gray-700 leading-relaxed flex-1">
          &ldquo;{item.quote}&rdquo;
        </p>

        {/* Author */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          {/* Avatar — colored circle with initials */}
          <div
            className={`h-11 w-11 rounded-full ${item.avatarColor} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}
            aria-hidden="true"
          >
            {item.initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {item.name}
            </p>
            <p className="text-xs text-gray-500 truncate">{item.title}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TestimonialsSection — Carousel đánh giá khách hàng.
 * Dùng Embla Carousel + autoplay 3s, pause on hover.
 * Mobile: 1 card | Tablet: 2 | Desktop: 3.
 */
export function TestimonialsSection() {
  const { ref: headingRef, isVisible: headingVisible } = useScrollReveal();

  const autoplayPlugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start', slidesToScroll: 1 },
    [autoplayPlugin.current],
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Dots state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', () => setSelectedIndex(emblaApi.selectedScrollSnap()));
    return () => { emblaApi.destroy(); };
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

  return (
    <section className="bg-gray-50 py-16 md:py-24" aria-label="Đánh giá khách hàng">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div
          ref={headingRef as React.RefObject<HTMLDivElement>}
          className={`text-center mb-12 transition-all duration-700 ${
            headingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <p className="text-sm font-semibold tracking-widest text-blue-600 uppercase mb-2">
            Phản hồi thực tế
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Khách hàng nói gì về chúng tôi
          </h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            Hàng trăm doanh nghiệp đã tin tưởng và đạt kết quả tốt hơn cùng chúng tôi.
          </p>
        </div>

        {/* Carousel wrapper */}
        <div className="relative">
          {/* Prev button */}
          <button
            type="button"
            onClick={scrollPrev}
            aria-label="Xem đánh giá trước"
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-blue-600 hover:shadow-lg transition-all hidden sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Viewport */}
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex -mx-3">
              {TESTIMONIALS.map((item) => (
                <TestimonialCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Next button */}
          <button
            type="button"
            onClick={scrollNext}
            aria-label="Xem đánh giá tiếp theo"
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-blue-600 hover:shadow-lg transition-all hidden sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Dots */}
        {scrollSnaps.length > 1 && (
          <div className="flex justify-center gap-2 mt-8" role="tablist" aria-label="Điều hướng carousel">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={index === selectedIndex}
                aria-label={`Đánh giá ${index + 1}`}
                onClick={() => scrollTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === selectedIndex
                    ? 'bg-blue-600 w-6'
                    : 'bg-gray-300 w-2 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
