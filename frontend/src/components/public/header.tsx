'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Phone, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { siteConfig } from '@/config/site.config';

/**
 * SmartHeader 2025 — Landing page header
 * - Transparent over hero, solid on scroll
 * - Smart CTA xuất hiện sau 200px scroll
 * - Phone số chỉ hiện khi scrolled
 * - Không có cart/wishlist (Landing template)
 */
export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    const handler = () => {
      const y = window.scrollY;
      setScrolled(y > 80);
      setShowCta(y > 200);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { href: '/', label: 'Trang chủ' },
    { href: '/about', label: 'Giới thiệu' },
    { href: '/contact', label: 'Liên hệ' },
    ...(siteConfig.features.blog ? [{ href: '/blog', label: 'Blog' }] : []),
    ...(siteConfig.features.faq ? [{ href: '/faq', label: 'FAQ' }] : []),
  ];

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-50 print:hidden transition-all duration-300',
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100'
          : 'bg-transparent',
      ].join(' ')}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            href="/"
            className={[
              'text-xl font-bold transition-colors duration-300',
              scrolled ? 'text-gray-900' : 'text-white',
            ].join(' ')}
          >
            {siteConfig.name}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  'text-sm font-medium transition-colors duration-300',
                  scrolled
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-white/80 hover:text-white',
                ].join(' ')}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">

            {/* Phone — chỉ hiện khi scrolled, desktop */}
            {scrolled && siteConfig.contact?.phoneDisplay && (
              <a
                href={`tel:${siteConfig.contact.phone}`}
                className="hidden md:flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                aria-label="Gọi điện"
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span>{siteConfig.contact.phoneDisplay}</span>
              </a>
            )}

            {/* ThemeToggle — chỉ khi bật darkMode */}
            {siteConfig.features.darkMode && <ThemeToggle />}

            {/* Smart CTA — hiện sau 200px scroll */}
            <div
              className={[
                'transition-all duration-300 origin-right',
                showCta
                  ? 'opacity-100 scale-100 pointer-events-auto'
                  : 'opacity-0 scale-90 pointer-events-none',
              ].join(' ')}
            >
              <Link href="/contact">
                <Button
                  size="sm"
                  className="rounded-full px-4 py-2 bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  Liên hệ ngay
                </Button>
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <button
              className={[
                'md:hidden flex items-center justify-center w-11 h-11 rounded-lg transition-colors',
                scrolled
                  ? 'text-gray-900 hover:bg-gray-100'
                  : 'text-white hover:bg-white/10',
              ].join(' ')}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            >
              {mobileOpen
                ? <X className="h-5 w-5" />
                : <Menu className="h-5 w-5" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-white shadow-xl rounded-b-2xl border-t border-gray-100 overflow-hidden">
          <nav className="flex flex-col py-2 px-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-3 px-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Phone trong mobile menu */}
            {siteConfig.contact?.phoneDisplay && (
              <a
                href={`tel:${siteConfig.contact.phone}`}
                className="flex items-center gap-2 py-3 px-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors mt-1 border-t border-gray-100"
                onClick={() => setMobileOpen(false)}
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span>{siteConfig.contact.phoneDisplay}</span>
              </a>
            )}

            {/* CTA mobile */}
            <div className="pt-2 pb-3">
              <Link href="/contact" onClick={() => setMobileOpen(false)}>
                <Button className="w-full rounded-full bg-primary text-white">
                  Liên hệ ngay
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
