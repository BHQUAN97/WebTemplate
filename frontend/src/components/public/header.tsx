'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ShoppingCart, User, Menu, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { useCartStore } from '@/lib/stores/cart-store';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Header trang cong khai — responsive, menu, cart, user
 */
export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const itemCount = useCartStore((s) => s.getItemCount());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const navLinks = [
    { href: '/', label: 'Trang chu' },
    { href: '/products', label: 'San pham' },
    { href: '/blog', label: 'Blog' },
    { href: '/about', label: 'Gioi thieu' },
    { href: '/contact', label: 'Lien he' },
    { href: '/faq', label: 'FAQ' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border print:hidden">
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
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
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

            <ThemeToggle />

            <Link href="/cart" className="relative">
              <Button variant="ghost" size="icon" aria-label="Gio hang">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {isAuthenticated ? (
              <Link href="/dashboard" className="hidden sm:block">
                <Button variant="ghost" size="icon" aria-label="Tai khoan">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">Dang nhap</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Dang ky</Button>
                </Link>
              </div>
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
                <>
                  <Link href="/login" className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => setMobileOpen(false)}>
                    Dang nhap
                  </Link>
                  <Link href="/register" className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => setMobileOpen(false)}>
                    Dang ky
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
