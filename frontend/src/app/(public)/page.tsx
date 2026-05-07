import type { Metadata } from 'next';
import { LandingClient } from './landing-client';

export const metadata: Metadata = {
  title: 'WebTemplate - Mua sắm trực tuyến hang dau',
  description:
    'Khám phá hàng nghìn sản phẩm chất lượng cao với giá tốt nhất. Giao hàng nhanh, hỗ trợ 24/7, bảo đảm hoàn tiền.',
  openGraph: {
    title: 'WebTemplate - Mua sắm trực tuyến hang dau',
    description:
      'Khám phá hàng nghìn sản phẩm chất lượng cao với giá tốt nhất.',
    type: 'website',
  },
};

/**
 * Landing page — server component cho SEO, delegate interactive parts cho client
 */
export default function LandingPage() {
  return <LandingClient />;
}
