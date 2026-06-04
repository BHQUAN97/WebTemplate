import type { Metadata } from 'next';
import Link from 'next/link';
import { ShoppingBag, LayoutDashboard, FileText, Users, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Giới thiệu — Tech Store Demo',
  description:
    'Tìm hiểu về nền tảng Tech Store Demo — demo đầy đủ tính năng e-commerce, blog và quản trị.',
};

const features = [
  {
    icon: ShoppingBag,
    title: 'E-commerce hoàn chỉnh',
    description: 'Sản phẩm, giỏ hàng, thanh toán, đơn hàng, wishlist — đầy đủ luồng mua sắm.',
  },
  {
    icon: LayoutDashboard,
    title: 'Admin Dashboard',
    description: 'Quản lý sản phẩm, đơn hàng, người dùng, cài đặt — giao diện trực quan.',
  },
  {
    icon: FileText,
    title: 'Blog & Nội dung',
    description: 'Hệ thống blog đầy đủ — tạo bài, phân loại, SEO, ảnh đại diện.',
  },
  {
    icon: Users,
    title: 'Xác thực & Phân quyền',
    description: 'JWT, 2FA, OAuth, phân quyền admin/user — bảo mật đa lớp.',
  },
  {
    icon: Zap,
    title: 'Hiệu năng cao',
    description: 'Next.js 14 App Router, server components, tối ưu hình ảnh, lazy loading.',
  },
  {
    icon: Shield,
    title: 'Bảo mật tích hợp',
    description: 'CSRF, rate limiting, helmet, sanitize input — tuân thủ OWASP.',
  },
];

const techStack = [
  { name: 'Next.js 14', category: 'Frontend' },
  { name: 'React 19', category: 'Frontend' },
  { name: 'TypeScript', category: 'Frontend' },
  { name: 'Tailwind CSS 4', category: 'Frontend' },
  { name: 'NestJS 10', category: 'Backend' },
  { name: 'TypeORM', category: 'Backend' },
  { name: 'MySQL 8', category: 'Database' },
  { name: 'Redis 7', category: 'Cache' },
  { name: 'BullMQ', category: 'Queue' },
  { name: 'Docker', category: 'DevOps' },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-600 to-violet-800 text-white py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block rounded-full bg-violet-500/30 px-4 py-1.5 text-sm font-medium mb-4">
            Bản Demo — Không phải shop thật
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Tech Store Demo
          </h1>
          <p className="text-lg text-violet-100 max-w-2xl mx-auto">
            Nền tảng web full-stack demo đầy đủ tính năng — được xây dựng để
            showcase khả năng của stack Next.js + NestJS + MySQL.
          </p>
        </div>
      </section>

      {/* Demo notice */}
      <section className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-start gap-3">
          <svg className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-amber-800">
            <strong>Đây là bản demo.</strong> Tất cả sản phẩm, đơn hàng và dữ liệu đều là giả lập.
            Liên hệ để nhận bản clone riêng cho dự án thực tế.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
          Tính năng có trong demo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="p-6">
              <CardContent className="p-0">
                <f.icon className="h-8 w-8 text-violet-600 mb-3" />
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-8">Tech Stack</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {techStack.map((t) => (
              <div key={t.name} className="flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-4 py-1.5 text-sm">
                <span className="font-medium text-gray-900">{t.name}</span>
                <span className="text-xs text-gray-400">— {t.category}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 bg-violet-600 text-white text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4">Muốn dùng cho dự án thực tế?</h2>
          <p className="text-violet-100 mb-6">
            Liên hệ để nhận bản clone riêng, tuỳ chỉnh theo ngành của bạn.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-violet-600 hover:bg-violet-50" asChild>
              <Link href="/contact">Liên hệ ngay</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
              <Link href="/products">Xem demo shop</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
