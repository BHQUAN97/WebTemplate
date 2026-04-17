import type { Metadata } from 'next';
import { LandingClient } from './landing-client';

export const metadata: Metadata = {
  title: 'WebTemplate - Mua sam truc tuyen hang dau',
  description:
    'Kham pha hang nghin san pham chat luong cao voi gia tot nhat. Giao hang nhanh, ho tro 24/7, bao dam hoan tien.',
  openGraph: {
    title: 'WebTemplate - Mua sam truc tuyen hang dau',
    description:
      'Kham pha hang nghin san pham chat luong cao voi gia tot nhat.',
    type: 'website',
  },
};

/**
 * Landing page — server component cho SEO, delegate interactive parts cho client
 */
export default function LandingPage() {
  return <LandingClient />;
}
