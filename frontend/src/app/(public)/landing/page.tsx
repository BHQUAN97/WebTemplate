import type { Metadata } from 'next';
import {
  HeroSection,
  ServicesSection,
  StatsSection,
  PortfolioSection,
  ProcessSection,
  TeamSection,
  TestimonialsSection,
  PartnersSection,
  CTABanner,
  ContactSection,
} from '@/components/public/sections';

export const metadata: Metadata = {
  title: 'Thiết kế Web & App chuyên nghiệp — Tech Store Demo Agency',
  description:
    'Dịch vụ thiết kế web, app mobile, SEO và branding cho doanh nghiệp Việt. Hơn 100 dự án, 50+ khách hàng hài lòng.',
  openGraph: {
    title: 'Thiết kế Web & App chuyên nghiệp — Tech Store Demo',
    description: 'Dịch vụ thiết kế web, app mobile, SEO và branding cho doanh nghiệp.',
    type: 'website',
  },
};

/**
 * Landing page doanh nghiệp dịch vụ — IT agency / digital marketing
 * Assembled từ section components, config theo site.config.ts
 */
export default function LandingPage() {
  return (
    <main>
      <HeroSection />
      <ServicesSection />
      <StatsSection />
      <PortfolioSection />
      <ProcessSection />
      <TeamSection />
      <TestimonialsSection />
      <PartnersSection />
      <CTABanner />
      <ContactSection />
    </main>
  );
}
