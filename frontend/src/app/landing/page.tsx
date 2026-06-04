import type { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
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
} from '@/components/public/sections'

export const metadata: Metadata = {
  title: siteConfig.seo.defaultTitle,
  description: siteConfig.seo.defaultDescription,
  openGraph: {
    title: siteConfig.seo.defaultTitle,
    description: siteConfig.seo.defaultDescription,
    images: [{ url: siteConfig.seo.ogImage, width: 1200, height: 630 }],
    locale: siteConfig.seo.locale,
    type: 'website',
  },
}

/**
 * Landing page doanh nghiệp — assembles sections theo siteConfig flags.
 * Để bật/tắt section: sửa siteConfig.sections trong site.config.ts
 */
export default function LandingPage() {
  const { sections, features } = siteConfig

  return (
    <main>
      {/* Hero — luôn hiện */}
      {sections.hero && <HeroSection />}

      {/* Services — dịch vụ chính */}
      {sections.services && <ServicesSection />}

      {/* Stats — số liệu ấn tượng */}
      {sections.stats && <StatsSection />}

      {/* Portfolio — dự án đã làm */}
      {sections.portfolio && <PortfolioSection />}

      {/* Process — quy trình làm việc */}
      <ProcessSection />

      {/* Team — đội ngũ */}
      {sections.team && <TeamSection />}

      {/* Testimonials — khách hàng nói gì */}
      {sections.testimonials && <TestimonialsSection />}

      {/* Partners — đối tác/khách hàng lớn */}
      {sections.partners && <PartnersSection />}

      {/* CTA Banner */}
      {sections.cta && <CTABanner />}

      {/* Contact */}
      {sections.contact && <ContactSection />}
    </main>
  )
}
