import type { Metadata } from 'next';
import { LandingClient } from './landing-client';

export const metadata: Metadata = {
  title: 'Tech Store Demo — Trải nghiệm mua sắm đầy đủ tính năng',
  description:
    'Khám phá hàng nghìn sản phẩm chất lượng cao với giá tốt nhất. Giao hàng nhanh, hỗ trợ 24/7, bảo đảm hoàn tiền.',
  openGraph: {
    title: 'Tech Store Demo — Trải nghiệm mua sắm đầy đủ tính năng',
    description:
      'Khám phá hàng nghìn sản phẩm chất lượng cao với giá tốt nhất.',
    type: 'website',
  },
};

/**
 * Landing page — server component cho SEO, delegate interactive parts cho client
 */
export default function LandingPage() {
  return (
    <>
      {/* Demo notice banner */}
      <div className="bg-violet-600 text-white text-center py-2.5 px-4 text-sm">
        <span className="font-medium">Đây là bản demo</span>
        {' '}— Tất cả dữ liệu là giả lập.{' '}
        <a href="/contact" className="underline hover:no-underline font-medium">
          Liên hệ để nhận bản riêng →
        </a>
      </div>
      <LandingClient />
    </>
  );
}
