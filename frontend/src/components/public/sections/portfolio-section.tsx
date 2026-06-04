'use client';

import { useState, useEffect, useRef } from 'react';
import { ZoomIn } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

/**
 * Danh muc filter + grid masonry (CSS columns) + lightbox
 */
type Category = 'all' | 'xay-dung' | 'noi-that' | 'thiet-ke';

interface PortfolioItem {
  id: number;
  title: string;
  category: Category;
  /** Gradient class cho placeholder */
  gradient: string;
  /** ty le: 'landscape' | 'portrait' */
  ratio: 'landscape' | 'portrait';
  src: string;
}

const ITEMS: PortfolioItem[] = [
  {
    id: 1,
    title: 'Biệt thự Vinhomes Grand Park',
    category: 'xay-dung',
    gradient: 'from-blue-100 to-blue-300',
    ratio: 'landscape',
    src: 'https://picsum.photos/seed/p1/800/600',
  },
  {
    id: 2,
    title: 'Nội thất chung cư cao cấp',
    category: 'noi-that',
    gradient: 'from-amber-100 to-amber-300',
    ratio: 'portrait',
    src: 'https://picsum.photos/seed/p2/600/800',
  },
  {
    id: 3,
    title: 'Thiết kế showroom thương hiệu',
    category: 'thiet-ke',
    gradient: 'from-purple-100 to-purple-300',
    ratio: 'landscape',
    src: 'https://picsum.photos/seed/p3/800/600',
  },
  {
    id: 4,
    title: 'Nhà phố 3 tầng quận 7',
    category: 'xay-dung',
    gradient: 'from-green-100 to-green-300',
    ratio: 'portrait',
    src: 'https://picsum.photos/seed/p4/600/800',
  },
  {
    id: 5,
    title: 'Cải tạo văn phòng làm việc',
    category: 'noi-that',
    gradient: 'from-rose-100 to-rose-300',
    ratio: 'landscape',
    src: 'https://picsum.photos/seed/p5/800/600',
  },
  {
    id: 6,
    title: 'Concept thiết kế nhà hàng',
    category: 'thiet-ke',
    gradient: 'from-sky-100 to-sky-300',
    ratio: 'portrait',
    src: 'https://picsum.photos/seed/p6/600/800',
  },
  {
    id: 7,
    title: 'Tổ hợp căn hộ Studio',
    category: 'xay-dung',
    gradient: 'from-teal-100 to-teal-300',
    ratio: 'landscape',
    src: 'https://picsum.photos/seed/p7/800/600',
  },
  {
    id: 8,
    title: 'Không gian bếp hiện đại',
    category: 'noi-that',
    gradient: 'from-orange-100 to-orange-300',
    ratio: 'portrait',
    src: 'https://picsum.photos/seed/p8/600/800',
  },
];

const FILTERS: { label: string; value: Category | 'all' }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Xây dựng', value: 'xay-dung' },
  { label: 'Nội thất', value: 'noi-that' },
  { label: 'Thiết kế', value: 'thiet-ke' },
];

const CATEGORY_LABELS: Record<Category, string> = {
  'all': '',
  'xay-dung': 'Xây dựng',
  'noi-that': 'Nội thất',
  'thiet-ke': 'Thiết kế',
};

/** Hook scroll reveal — thêm class visible khi element vào viewport */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

export function PortfolioSection() {
  const [activeFilter, setActiveFilter] = useState<Category | 'all'>('all');
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const { ref: sectionRef, visible } = useScrollReveal();

  const filtered =
    activeFilter === 'all'
      ? ITEMS
      : ITEMS.filter((item) => item.category === activeFilter);

  // Slides cho lightbox — dùng picsum thật hoặc placeholder
  const slides = filtered.map((item) => ({ src: item.src }));

  return (
    <section ref={sectionRef} className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tiêu đề */}
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-2">
            Công trình tiêu biểu
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Portfolio dự án
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            Những công trình chúng tôi đã thực hiện — từ ý tưởng đến hoàn thiện.
          </p>
        </div>

        {/* Filter tabs */}
        <div
          className={`flex flex-wrap justify-center gap-2 mb-10 transition-all duration-700 delay-150 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value as Category | 'all')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] ${
                activeFilter === f.value
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Masonry grid — CSS columns */}
        <div
          className={`columns-1 sm:columns-2 lg:columns-3 gap-4 transition-all duration-700 delay-300 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {filtered.map((item, i) => (
            <div
              key={item.id}
              className="break-inside-avoid mb-4"
              style={{
                transitionDelay: `${300 + i * 60}ms`,
              }}
            >
              <div
                className="relative group overflow-hidden rounded-xl cursor-pointer"
                onClick={() => setLightboxIndex(i)}
                role="button"
                tabIndex={0}
                aria-label={`Xem ảnh: ${item.title}`}
                onKeyDown={(e) => e.key === 'Enter' && setLightboxIndex(i)}
              >
                {/* Placeholder thay ảnh thật */}
                <div
                  className={`w-full bg-gradient-to-br ${item.gradient} flex items-center justify-center ${
                    item.ratio === 'landscape' ? 'aspect-[4/3]' : 'aspect-[3/4]'
                  }`}
                >
                  <span className="text-gray-500 text-sm font-medium select-none">
                    Ảnh dự án {item.id}
                  </span>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 px-4">
                  <ZoomIn className="text-white w-8 h-8 mb-1" strokeWidth={1.5} />
                  <p className="text-white font-semibold text-sm text-center leading-snug">
                    {item.title}
                  </p>
                  <span className="text-blue-300 text-xs font-medium">
                    {CATEGORY_LABELS[item.category]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox */}
        <Lightbox
          open={lightboxIndex >= 0}
          index={lightboxIndex}
          close={() => setLightboxIndex(-1)}
          slides={slides}
        />
      </div>
    </section>
  );
}
