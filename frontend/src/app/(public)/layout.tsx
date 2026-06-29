import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { SpeedDialFab } from '@/components/shared/speed-dial-fab';
import { BottomTabBar } from '@/components/public/bottom-tab-bar';
import { ChatWidgetProvider } from '@/components/chat/chat-widget-provider';

/**
 * Layout cho cac trang public — header, footer, floating CTA, bottom tab bar.
 * pb-14 chi tren mobile de tranh Nội dung bi che boi bottom tab bar.
 * Chat widget chi mount o day — khong them vao admin/dashboard.
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
      <SpeedDialFab />
      <BottomTabBar />
      <ChatWidgetProvider />
    </>
  );
}
