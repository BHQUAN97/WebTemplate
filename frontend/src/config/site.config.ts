/**
 * site.config.ts — FILE DUY NHẤT cần đổi khi clone cho KH mới.
 *
 * Bao gồm: thông tin thương hiệu, liên hệ, mạng xã hội,
 * theme màu sắc, feature flags, section flags, SEO.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SiteTheme {
  /** Màu chủ đạo — button, link, highlight (hex) */
  primary: string
  /** Màu phụ — dark background, dark text (hex) */
  secondary: string
  /** Màu nhấn — badge, CTA phụ (hex) */
  accent: string
  /** Google Fonts slug cho heading */
  fontHeading: string
  /** Google Fonts slug cho body */
  fontBody: string
}

export interface SiteContactFull {
  phone: string
  /** Định dạng hiển thị: "090 123 4567" */
  phoneDisplay: string
  email: string
  address: string
  /** Ví dụ: "8:00 - 17:30, Thứ 2 - Thứ 7" */
  hours: string
  /** URL mở Google Maps */
  googleMapsUrl: string
  /** Iframe embed src (để trống nếu không dùng) */
  googleMapsEmbed: string
  /** SĐT Zalo (để trống nếu không có) */
  zalo: string
}

export interface SiteFeatures {
  /** Hiện blog / tin tức */
  blog: boolean
  /** Hiện trang FAQ */
  faq: boolean
  /** Hiện phần đánh giá khách hàng */
  reviews: boolean
  /** Hiện form đăng ký nhận email */
  newsletter: boolean
  /** Hiện chat widget */
  chat: boolean
  /** Bật tính năng đặt lịch/bàn (Restaurant, Clinic, Spa...) */
  booking: boolean
  /** Bật trang QR Menu (Restaurant only) */
  qrMenu: boolean
  /** Hiện Google Maps trong trang liên hệ */
  map: boolean
  /** Cho phép chuyển dark/light mode */
  darkMode: boolean
}

export interface SiteSections {
  /** Section hero (banner đầu trang) */
  hero: boolean
  /** 4 USP cards (miễn phí giao hàng, hỗ trợ 24/7...) */
  features: boolean
  /** Danh sách dịch vụ (Landing, Spa, Clinic...) */
  services: boolean
  /** Grid dự án đã làm (Landing only) */
  portfolio: boolean
  /** Danh mục & món ăn nổi bật (Restaurant only) */
  menu: boolean
  /** Đội ngũ */
  team: boolean
  /** Testimonials slider */
  testimonials: boolean
  /** Số liệu (1000+ KH, 5 năm kinh nghiệm...) */
  stats: boolean
  /** Logo đối tác / KH lớn */
  partners: boolean
  /** CTA banner (nền màu primary) */
  cta: boolean
  /** Widget đặt lịch/bàn nhanh trên homepage */
  booking: boolean
  /** Section thông tin liên hệ */
  contact: boolean
}

export interface SiteConfig {
  name: string
  shortName: string
  tagline: string
  description: string
  logo: {
    src: string
    width: number
    height: number
    alt: string
  }
  contact: SiteContactFull
  social: {
    facebook: string
    zalo: string
    youtube: string
    instagram: string
    tiktok: string
  }
  theme: SiteTheme
  features: SiteFeatures
  sections: SiteSections
  seo: {
    titleTemplate: string
    defaultTitle: string
    defaultDescription: string
    ogImage: string
    locale: string
  }
}

// ─── Config ──────────────────────────────────────────────────────────────────

export const siteConfig: SiteConfig = {
  // Đổi các trường này khi clone cho KH mới ↓

  name: 'WebTemplate',
  shortName: 'WT',
  tagline: 'Một nền tảng. Mọi nhu cầu.',
  description:
    'Nền tảng web đầy đủ tính năng — thương mại điện tử, blog, quản trị và hơn thế nữa.',

  logo: {
    src: '/logo.png',
    width: 120,
    height: 40,
    alt: 'WebTemplate',
  },

  contact: {
    phone: '0900000000',
    phoneDisplay: '090 000 0000',
    email: 'hello@webtemplate.dev',
    address: 'Hà Nội, Việt Nam',
    hours: '8:00 - 17:30, Thứ 2 - Thứ 7',
    googleMapsUrl: 'https://maps.google.com',
    googleMapsEmbed: '',
    zalo: '',
  },

  social: {
    facebook: 'https://facebook.com/webtemplate',
    zalo: '',
    youtube: '',
    instagram: 'https://instagram.com/webtemplate',
    tiktok: '',
  },

  // Đổi 3 hex này = đổi toàn bộ màu giao diện
  theme: {
    primary: '#2563EB',
    secondary: '#0F172A',
    accent: '#F59E0B',
    fontHeading: 'Geist',
    fontBody: 'Geist',
  },

  features: {
    blog: true,
    faq: true,
    reviews: true,
    newsletter: true,
    chat: false,
    booking: false,
    qrMenu: false,
    map: true,
    darkMode: true,
  },

  sections: {
    hero: true,
    features: true,
    services: true,
    portfolio: true,
    menu: false,
    team: true,
    testimonials: true,
    stats: true,
    partners: true,
    cta: true,
    booking: false,
    contact: true,
  },

  seo: {
    titleTemplate: '%s | WebTemplate',
    defaultTitle: 'WebTemplate — Một nền tảng. Mọi nhu cầu.',
    defaultDescription:
      'Nền tảng web đầy đủ tính năng với thương mại điện tử, blog, và quản trị.',
    ogImage: '/og-default.png',
    locale: 'vi_VN',
  },
}

export default siteConfig
