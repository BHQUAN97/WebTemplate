'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, FileText, Hammer, CheckCircle, type LucideIcon } from 'lucide-react';

/**
 * Quy trinh lam viec — 4 buoc, timeline connector, scroll reveal stagger
 */

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    icon: MessageSquare,
    title: 'Tư vấn miễn phí',
    description:
      'Gặp gỡ, lắng nghe nhu cầu và khảo sát hiện trạng công trình của bạn.',
  },
  {
    number: 2,
    icon: FileText,
    title: 'Lên phương án',
    description:
      'Thiết kế chi tiết, báo giá minh bạch — bạn nắm rõ mọi hạng mục trước khi ký kết.',
  },
  {
    number: 3,
    icon: Hammer,
    title: 'Thực hiện dự án',
    description:
      'Thi công đúng tiến độ, đội ngũ lành nghề, giám sát chặt chẽ từng giai đoạn.',
  },
  {
    number: 4,
    icon: CheckCircle,
    title: 'Bàn giao & Bảo hành',
    description:
      'Nghiệm thu cùng chủ nhà, bàn giao đầy đủ hồ sơ và bảo hành dài hạn.',
  },
];

/** Hook scroll reveal đơn giản */
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

export function ProcessSection() {
  const { ref: sectionRef, visible } = useScrollReveal();

  return (
    <section ref={sectionRef} className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tiêu đề */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-2">
            Quy trình làm việc
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Chúng tôi làm việc như thế nào?
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            Quy trình rõ ràng, minh bạch — giúp bạn yên tâm từ bước đầu đến
            khi hoàn thiện công trình.
          </p>
        </div>

        {/* Desktop: 4 cols horizontal + connector line */}
        {/* Mobile: vertical timeline */}
        <div className="relative">
          {/* Connecting line — desktop only */}
          <div
            className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-blue-100"
            aria-hidden
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const delay = 200 + i * 120;

              return (
                <div
                  key={step.number}
                  className={`flex lg:flex-col items-start lg:items-center gap-5 lg:gap-0 transition-all duration-700 ${
                    visible
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${delay}ms` }}
                >
                  {/* Vertical mobile connector */}
                  <div className="flex flex-col items-center lg:hidden flex-shrink-0">
                    <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white shadow-md">
                      <Icon className="w-5 h-5" strokeWidth={2} />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="w-0.5 h-12 bg-blue-100 mt-1" aria-hidden />
                    )}
                  </div>

                  {/* Desktop circle số + icon */}
                  <div className="hidden lg:flex flex-col items-center mb-6">
                    <div className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-blue-600 text-white shadow-lg">
                      <Icon className="w-7 h-7" strokeWidth={1.8} />
                      {/* Số nhỏ góc trên phải */}
                      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-blue-600 text-blue-700 text-xs font-bold flex items-center justify-center">
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="lg:text-center">
                    {/* Số bước — mobile */}
                    <span className="inline-block lg:hidden text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                      Bước {step.number}
                    </span>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
