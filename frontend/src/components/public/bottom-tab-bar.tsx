'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/lib/stores/cart-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCtaSettings } from '@/lib/hooks/use-cta-settings';
import { useHydration } from '@/lib/hooks';

interface TabItem {
  href: string;
  label: string;
  icon: typeof Home;
  badge?: number;
}

/**
 * Bottom tab bar mobile — sticky duoi, an tren md+.
 * 4 tab chinh cho e-commerce: Home / Search / Cart / Account.
 * Toggle bang setting cta.bottom_tab_enabled.
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const hydrated = useHydration();
  const itemCount = useCartStore((s) => s.getItemCount());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const cta = useCtaSettings();

  if (!cta.bottomTab) return null;

  const tabs: TabItem[] = [
    { href: '/', label: 'Trang chu', icon: Home },
    { href: '/search', label: 'Tim kiem', icon: Search },
    {
      href: '/cart',
      label: 'Gio hang',
      icon: ShoppingCart,
      badge: hydrated ? itemCount : 0,
    },
    {
      href: hydrated && isAuthenticated ? '/dashboard' : '/login',
      label: hydrated && isAuthenticated ? 'Tai khoan' : 'Dang nhap',
      icon: User,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="Dieu huong chinh"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background border-t border-border print:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="flex items-stretch h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          return (
            <li key={tab.label} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  active
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-800',
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden />
                  {tab.badge && tab.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 h-4 min-w-4 rounded-full bg-red-500 text-white text-[10px] px-1 flex items-center justify-center">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  ) : null}
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
