'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingCart, Heart, User, Menu, X, Search, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/stores/cart-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useHydration } from '@/lib/hooks';

/**
 * Header chinh — responsive, hien thi menu, cart, user
 */
export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const hydrated = useHydration();
  const itemCount = useCartStore((s) => s.getItemCount());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Detect platform de hien thi ⌘K hoac Ctrl+K cho dung
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    // navigator.platform deprecated nhung van chinh xac cho detect Mac
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform));
  }, []);

  const openPalette = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-command-palette'));
    }
  };

  const navLinks = [
    { href: '/', label: 'Trang chu' },
    { href: '/products', label: 'San pham' },
    { href: '/blog', label: 'Blog' },
    { href: '/about', label: 'Gioi thieu' },
    { href: '/contact', label: 'Lien he' },
    { href: '/faq', label: 'FAQ' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-blue-600">
            WebTemplate
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link href="/search">
              <Button variant="ghost" size="icon" aria-label="Tim kiem">
                <Search className="h-5 w-5" />
              </Button>
            </Link>

            {/* Command palette trigger — chi hien desktop, hien thi hint phim tat */}
            <Button
              variant="outline"
              size="sm"
              onClick={openPalette}
              aria-label="Open command palette"
              className="hidden md:inline-flex items-center gap-2 text-muted-foreground"
            >
              <Command className="h-4 w-4" />
              <span className="text-xs font-medium">
                {isMac ? '⌘K' : 'Ctrl+K'}
              </span>
            </Button>

            <Link href="/cart" className="relative">
              <Button variant="ghost" size="icon" aria-label="Gio hang">
                <ShoppingCart className="h-5 w-5" />
                {hydrated && itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Button>
            </Link>

            <Link href={isAuthenticated ? '/wishlist' : '/login'} className="hidden sm:block">
              <Button variant="ghost" size="icon" aria-label="Yeu thich">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>

            {hydrated && isAuthenticated ? (
              <Link href="/" className="hidden sm:block">
                <Button variant="ghost" size="icon" aria-label="Tai khoan">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link href="/login" className="hidden sm:block">
                <Button variant="outline" size="sm">
                  Dang nhap
                </Button>
              </Link>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                  onClick={() => setMobileOpen(false)}
                >
                  Dang nhap
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
