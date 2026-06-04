import { PublicHeader } from '@/components/public/header'
import { PublicFooter } from '@/components/public/footer'
import { FloatingContactBar } from '@/components/public/floating-contact-bar'

/**
 * Layout riêng cho Landing Page — dùng SmartHeader (transparent→solid on scroll)
 * thay vì e-commerce header có cart/wishlist.
 * Override (public)/layout.tsx chỉ cho route /landing.
 */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
      <FloatingContactBar />
    </>
  )
}
