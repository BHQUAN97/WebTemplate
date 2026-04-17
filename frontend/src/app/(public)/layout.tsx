import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';

/**
 * Layout cho cac trang public — co header va footer
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
