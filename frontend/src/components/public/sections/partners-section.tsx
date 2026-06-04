'use client';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Partner {
  id: number;
  name: string;
  /** Chữ viết tắt / tên ngắn hiển thị trong placeholder */
  short: string;
}

const PARTNERS: Partner[] = [
  { id: 1,  name: 'Tập đoàn Vingroup',          short: 'Vingroup'   },
  { id: 2,  name: 'Công ty FPT Software',        short: 'FPT'        },
  { id: 3,  name: 'VNPT Technology',             short: 'VNPT'       },
  { id: 4,  name: 'Viettel Solutions',           short: 'Viettel'    },
  { id: 5,  name: 'Masan Group',                 short: 'Masan'      },
  { id: 6,  name: 'Techcombank',                 short: 'TCB'        },
  { id: 7,  name: 'Tiki Corporation',            short: 'Tiki'       },
  { id: 8,  name: 'MoMo E-Wallet',               short: 'MoMo'       },
  { id: 9,  name: 'VNG Corporation',             short: 'VNG'        },
  { id: 10, name: 'Shopee Vietnam',              short: 'Shopee'     },
];

// ─── Logo Placeholder ─────────────────────────────────────────────────────────

function LogoItem({ partner }: { partner: Partner }) {
  return (
    <div
      className="flex-shrink-0 mx-6 flex items-center justify-center h-14 w-36 rounded-lg border border-gray-200 bg-white px-4 py-2 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-default select-none"
      title={partner.name}
      aria-label={partner.name}
    >
      <span className="text-sm font-bold text-gray-700 tracking-wide truncate">
        {partner.short}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * PartnersSection — Logo đối tác cuộn vô hạn (CSS marquee).
 * Duplicate items để tạo vòng lặp liền mạch không giật.
 * Hover tạm dừng animation.
 */
export function PartnersSection() {
  // Duplicate để đảm bảo marquee liền mạch
  const items = [...PARTNERS, ...PARTNERS];

  return (
    <section className="bg-white py-12 md:py-16 overflow-hidden" aria-label="Đối tác và khách hàng">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center">
        <p className="text-sm font-semibold tracking-widest text-gray-400 uppercase">
          Đối tác &amp; Khách hàng tin dùng
        </p>
      </div>

      {/* Marquee track */}
      <div
        className="relative flex"
        style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)' }}
      >
        <div
          className="flex items-center"
          style={{
            animation: 'marquee 30s linear infinite',
            willChange: 'transform',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.animationPlayState = 'paused';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.animationPlayState = 'running';
          }}
          aria-hidden="true"
        >
          {items.map((partner, index) => (
            <LogoItem key={`${partner.id}-${index}`} partner={partner} />
          ))}
        </div>
      </div>

      {/* Keyframe animation — injected inline để không phụ thuộc config Tailwind */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
