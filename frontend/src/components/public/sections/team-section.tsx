'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Doi ngu — cards voi avatar gradient, initials, social hover
 */

interface TeamMember {
  id: number;
  name: string;
  role: string;
  bio: string;
  /** 2 mau gradient cho avatar */
  gradientFrom: string;
  gradientTo: string;
  linkedinUrl?: string;
}

const TEAM: TeamMember[] = [
  {
    id: 1,
    name: 'Nguyễn Văn An',
    role: 'Giám đốc',
    bio: '15 năm kinh nghiệm trong ngành xây dựng và thiết kế nội thất cao cấp.',
    gradientFrom: 'from-blue-400',
    gradientTo: 'to-blue-600',
    linkedinUrl: '#',
  },
  {
    id: 2,
    name: 'Trần Thị Bình',
    role: 'Trưởng phòng Kỹ thuật',
    bio: 'Kỹ sư xây dựng tốt nghiệp ĐH Bách Khoa Hà Nội, chuyên gia kết cấu.',
    gradientFrom: 'from-rose-400',
    gradientTo: 'to-rose-600',
    linkedinUrl: '#',
  },
  {
    id: 3,
    name: 'Lê Hoàng Nam',
    role: 'Quản lý Dự án',
    bio: 'PMP certified, đã quản lý thành công 10+ dự án lớn tại TP.HCM và Hà Nội.',
    gradientFrom: 'from-emerald-400',
    gradientTo: 'to-emerald-600',
    linkedinUrl: '#',
  },
  {
    id: 4,
    name: 'Phạm Minh Châu',
    role: 'Thiết kế trưởng',
    bio: 'Award-winning interior designer, phong cách hiện đại — tối giản và bền vững.',
    gradientFrom: 'from-purple-400',
    gradientTo: 'to-purple-600',
    linkedinUrl: '#',
  },
];

/** Lấy 2 ký tự đầu của tên (first + last) làm initials */
function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Hook scroll reveal */
function useScrollReveal(threshold = 0.1) {
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

export function TeamSection() {
  const { ref: sectionRef, visible } = useScrollReveal();

  return (
    <section ref={sectionRef} className="py-16 sm:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tiêu đề */}
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-2">
            Con người
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Đội ngũ chuyên gia
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            Những con người tận tâm, giàu kinh nghiệm — đứng sau mọi công trình
            chúng tôi tự hào.
          </p>
        </div>

        {/* Grid: 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {TEAM.map((member, i) => {
            const delay = 150 + i * 100;
            const initials = getInitials(member.name);

            return (
              <div
                key={member.id}
                className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-2 transition-all duration-300 ${
                  visible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${delay}ms` }}
              >
                {/* Avatar area */}
                <div className="relative pt-8 pb-4 px-6 flex flex-col items-center">
                  {/* Avatar tròn — gradient + initials */}
                  <div
                    className={`w-20 h-20 rounded-full bg-gradient-to-br ${member.gradientFrom} ${member.gradientTo} flex items-center justify-center shadow-md mb-4 flex-shrink-0`}
                  >
                    <span className="text-white text-xl font-bold select-none">
                      {initials}
                    </span>
                  </div>

                  {/* Social icon — hiện khi hover card */}
                  <a
                    href={member.linkedinUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Hồ sơ của ${member.name}`}
                    className="absolute top-4 right-4 p-2 rounded-full bg-blue-50 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" strokeWidth={1.8} />
                  </a>
                </div>

                {/* Content */}
                <div className="pb-6 px-6 text-center">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-snug mb-0.5">
                    {member.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-600 font-medium mb-2">
                    {member.role}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                    {member.bio}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
