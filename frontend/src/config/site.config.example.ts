/**
 * site.config.example.ts — TEMPLATE BLANK CHO KH MỚI
 *
 * Copy file này thành site.config.ts, điền thông tin KH, xong.
 * Chỉ cần đổi file này để customize toàn bộ website.
 *
 * Hướng dẫn nhanh:
 *   1. Đổi name, tagline, description
 *   2. Điền contact (phone, email, address, hours)
 *   3. Đổi 3 màu trong theme (primary, secondary, accent)
 *   4. Bật/tắt features và sections theo nhu cầu KH
 *   5. Thay logo: public/logo.png (PNG, nền trong suốt, ~200x60px)
 */

import type { SiteConfig } from './site.config'

export const siteConfig: SiteConfig = {
  // ── THÔNG TIN THƯƠNG HIỆU ─────────────────────────────────
  name: 'Tên Công Ty / Thương Hiệu',
  shortName: 'ABC',
  tagline: 'Slogan ngắn gọn của KH',
  description: 'Mô tả SEO (150-160 ký tự). Mô tả công ty, dịch vụ chính, địa bàn hoạt động.',

  logo: {
    src: '/logo.png',          // đặt trong public/
    width: 120,
    height: 40,
    alt: 'Logo Tên Công Ty',
  },

  // ── LIÊN HỆ ──────────────────────────────────────────────
  contact: {
    phone: '0901234567',
    phoneDisplay: '090 123 4567',   // format đẹp để hiển thị
    email: 'info@domain.vn',
    address: '123 Tên Đường, Phường/Xã, Quận/Huyện, Tỉnh/TP',
    hours: '8:00 - 17:30, Thứ 2 - Thứ 7',
    googleMapsUrl: 'https://maps.google.com/?q=Ten+Cong+Ty',
    googleMapsEmbed: '',  // lấy từ Google Maps → Share → Embed → copy src
    zalo: '0901234567',   // để '' nếu không có Zalo
  },

  // ── MẠNG XÃ HỘI ──────────────────────────────────────────
  // Để chuỗi rỗng '' nếu không có tài khoản — icon sẽ tự ẩn
  social: {
    facebook: 'https://facebook.com/tencongty',
    zalo: 'https://zalo.me/0901234567',
    youtube: '',
    instagram: '',
    tiktok: '',
  },

  // ── THEME MÀU SẮC ─────────────────────────────────────────
  // Đổi 3 hex này = đổi toàn bộ màu giao diện
  // Gợi ý theo ngành:
  //   Nhà hàng:   primary #DC2626 (đỏ), accent #F59E0B (cam)
  //   Spa/Nail:   primary #EC4899 (hồng), accent #A855F7 (tím)
  //   Phòng khám: primary #0891B2 (xanh dương), accent #10B981 (xanh lá)
  //   BĐS:        primary #1D4ED8 (xanh đậm), accent #F59E0B (vàng)
  //   Gym:        primary #DC2626 (đỏ), secondary #111827 (đen), accent #F59E0B
  theme: {
    primary: '#2563EB',      // màu chủ đạo
    secondary: '#0F172A',    // màu phụ (thường là tối)
    accent: '#F59E0B',       // màu nhấn
    fontHeading: 'Be Vietnam Pro',
    fontBody: 'Inter',
  },

  // ── BẬT/TẮT TÍNH NĂNG ────────────────────────────────────
  features: {
    blog: true,              // blog/tin tức
    faq: true,               // trang FAQ
    reviews: true,           // đánh giá khách hàng
    newsletter: false,       // đăng ký nhận email
    chat: false,             // chat widget
    booking: false,          // đặt lịch/bàn (Restaurant, Clinic, Spa)
    qrMenu: false,           // QR Menu (Restaurant only)
    map: true,               // Google Maps trang liên hệ
    darkMode: false,         // toggle dark/light mode
  },

  // ── BẬT/TẮT SECTION HOMEPAGE ─────────────────────────────
  // Tắt section nào không cần → layout tự co lại đẹp
  sections: {
    hero: true,
    features: true,          // 4 USP cards
    services: true,          // danh sách dịch vụ
    portfolio: false,        // grid dự án (Landing only)
    menu: false,             // menu món ăn (Restaurant only)
    team: false,             // đội ngũ
    testimonials: true,      // khách hàng nói gì
    stats: true,             // số liệu
    partners: false,         // logo đối tác
    cta: true,               // CTA banner
    booking: false,          // form đặt lịch nhanh
    contact: true,           // section liên hệ
  },

  // ── SEO ──────────────────────────────────────────────────
  seo: {
    titleTemplate: '%s | Tên Công Ty',
    defaultTitle: 'Tên Công Ty — Tagline',
    defaultDescription: 'Mô tả SEO giống trường description ở trên.',
    ogImage: '/og-image.jpg',   // 1200x630px, đặt trong public/
    locale: 'vi_VN',
  },
}

export default siteConfig
