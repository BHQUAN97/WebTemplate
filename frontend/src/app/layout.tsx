import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { CommandPaletteProvider } from '@/components/providers/command-palette-provider';
import { ServiceWorkerProvider } from '@/components/providers/service-worker-provider';
import { CookieConsent } from '@/components/shared/cookie-consent';
import { PWAInstallPrompt } from '@/components/shared/pwa-install-prompt';
import { brand } from '@/lib/config/brand';
import { JsonLd, organizationJsonLd, websiteJsonLd } from '@/lib/seo/json-ld';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || brand.name;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:6000'),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: brand.description,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: APP_NAME,
    description: brand.description,
    type: 'website',
    siteName: APP_NAME,
    locale: 'vi_VN',
    url: '/',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: APP_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Lay locale + messages server-side tu next-intl
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <CommandPaletteProvider>
              <ServiceWorkerProvider>{children}</ServiceWorkerProvider>
            </CommandPaletteProvider>
            <CookieConsent />
            <PWAInstallPrompt />
            <Toaster />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
