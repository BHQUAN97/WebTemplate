import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { FloatingContactBar } from '@/components/public/floating-contact-bar';
import { BottomTabBar } from '@/components/public/bottom-tab-bar';

/**
 * Layout cho cac trang public — header, footer, floating CTA, bottom tab bar.
 * pb-14 chi tren mobile de tranh noi dung bi che boi bottom tab bar.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 pb-14 md:pb-0">{children}</main>
      <Footer />
      <FloatingContactBar />
      <BottomTabBar />
    </>
  );
}
