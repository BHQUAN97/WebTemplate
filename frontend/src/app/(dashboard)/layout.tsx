'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  ShoppingBag,
  Heart,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useHydration } from '@/lib/hooks';
import { authApi } from '@/lib/api/modules/auth.api';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tong quan' },
  { href: '/profile', icon: User, label: 'Ho so' },
  { href: '/orders', icon: ShoppingBag, label: 'Don hang' },
  { href: '/wishlist', icon: Heart, label: 'Yeu thich' },
  { href: '/settings', icon: Settings, label: 'Cai dat' },
];

/**
 * Layout dashboard — sidebar + content, responsive
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydration();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    logout();
    router.push('/login');
  };

  // Redirect to login if not authenticated
  if (hydrated && !user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-50 bg-background border-b border-border px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-blue-600">
          WebTemplate
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Menu"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-background border-r border-border transition-transform lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="hidden lg:flex items-center h-14 px-6 border-b border-border">
              <Link href="/" className="text-lg font-bold text-primary">
                WebTemplate
              </Link>
            </div>

            {/* User info */}
            <div className="px-6 py-4 border-b border-border">
              <p className="text-sm font-medium text-foreground truncate">
                {hydrated ? user?.name : '...'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {hydrated ? user?.email : '...'}
              </p>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
              {sidebarLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/80 hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="px-3 py-4 border-t border-border">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="h-5 w-5" />
                Dang xuat
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay on mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
