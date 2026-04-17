'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Warehouse,
  Tags, Star, FileText, File, Navigation, Users, Image, BarChart3,
  FileBarChart, Settings, CreditCard, Key, Webhook, ScrollText,
  ChevronLeft, MessageSquare, Bot, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores/ui.store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import * as React from 'react';
import { adminChatApi } from '@/lib/api/modules/admin-chat.api';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: Array<{ label: string; href: string }>;
  /** Role (hoac list role) duoc xem muc nay — undefined = ai cung thay */
  requiredRole?: UserRole | UserRole[];
  /** Badge so luong (vd: so conversation WAITING) */
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: '',
    items: [
      { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    title: 'E-Commerce',
    items: [
      { label: 'San pham', href: '/admin/products', icon: <Package className="h-4 w-4" /> },
      { label: 'Danh muc', href: '/admin/categories', icon: <FolderTree className="h-4 w-4" /> },
      { label: 'Don hang', href: '/admin/orders', icon: <ShoppingCart className="h-4 w-4" /> },
      { label: 'Kho hang', href: '/admin/inventory', icon: <Warehouse className="h-4 w-4" /> },
      { label: 'Khuyen mai', href: '/admin/promotions', icon: <Tags className="h-4 w-4" /> },
      { label: 'Danh gia', href: '/admin/reviews', icon: <Star className="h-4 w-4" /> },
    ],
  },
  {
    title: 'CMS',
    items: [
      { label: 'Bai viet', href: '/admin/articles', icon: <FileText className="h-4 w-4" /> },
      { label: 'Trang', href: '/admin/pages', icon: <File className="h-4 w-4" /> },
      { label: 'Navigation', href: '/admin/navigation', icon: <Navigation className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Cham soc khach hang',
    items: [
      { label: 'Hop thoai', href: '/admin/chat', icon: <MessageSquare className="h-4 w-4" /> },
      { label: 'Kich ban', href: '/admin/chat-scenarios', icon: <Bot className="h-4 w-4" /> },
      { label: 'Khung gio', href: '/admin/chat-schedules', icon: <Clock className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Quan ly',
    items: [
      {
        label: 'Nguoi dung',
        href: '/admin/users',
        icon: <Users className="h-4 w-4" />,
        requiredRole: UserRole.ADMIN,
      },
      { label: 'Media', href: '/admin/media', icon: <Image className="h-4 w-4" /> },
      { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 className="h-4 w-4" /> },
      { label: 'Bao cao', href: '/admin/reports', icon: <FileBarChart className="h-4 w-4" /> },
    ],
  },
  {
    title: 'He thong',
    items: [
      {
        label: 'Cai dat',
        href: '/admin/settings',
        icon: <Settings className="h-4 w-4" />,
        requiredRole: UserRole.ADMIN,
      },
      { label: 'Plans', href: '/admin/plans', icon: <CreditCard className="h-4 w-4" /> },
      {
        label: 'API Keys',
        href: '/admin/api-keys',
        icon: <Key className="h-4 w-4" />,
        requiredRole: UserRole.ADMIN,
      },
      {
        label: 'Webhooks',
        href: '/admin/webhooks',
        icon: <Webhook className="h-4 w-4" />,
        requiredRole: UserRole.ADMIN,
      },
      {
        label: 'Logs',
        href: '/admin/logs',
        icon: <ScrollText className="h-4 w-4" />,
        requiredRole: UserRole.ADMIN,
      },
    ],
  },
];

/**
 * Check user co role du de thay nav item.
 * requiredRole = undefined → moi nguoi thay.
 */
function hasAccess(
  userRole: UserRole | undefined,
  required?: UserRole | UserRole[],
): boolean {
  if (!required) return true;
  if (!userRole) return false;
  if (Array.isArray(required)) return required.includes(userRole);
  return userRole === required;
}

/**
 * Admin sidebar — collapsible, nhom theo chuc nang, filter theo role
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role;

  // Dem so conversation dang cho nhan vien — refresh moi 30s
  const [waitingCount, setWaitingCount] = React.useState(0);
  React.useEffect(() => {
    if (!userRole) return;
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await adminChatApi.listConversations({ status: 'WAITING_AGENT', limit: 1, page: 1 });
        if (cancelled) return;
        // Ho tro ca response co pagination hoac array thuan
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const total = (res as any)?.pagination?.total ?? (Array.isArray(res) ? res.length : (res as any)?.data?.length ?? 0);
        setWaitingCount(total);
      } catch {
        // Silent fail — badge chi la enhancement
      }
    };
    fetchCount();
    const timer = setInterval(fetchCount, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [userRole]);

  // Filter nav items theo role, an group neu khong con item nao
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => hasAccess(userRole, item.requiredRole))
        .map((item) =>
          item.href === '/admin/chat' ? { ...item, badge: waitingCount } : item,
        ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-background border-r border-border transition-all duration-300 print:hidden',
        sidebarOpen ? 'w-64' : 'w-16',
      )}
    >
      {/* Logo + collapse */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {sidebarOpen && (
          <Link href="/admin" className="text-lg font-bold text-blue-600">
            Admin
          </Link>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
          <ChevronLeft className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {visibleGroups.map((group, gi) => (
          <div key={gi} className="mb-4">
            {group.title && sidebarOpen && (
              <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = item.href
                ? pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href + '/'))
                : false;

              return (
                <Link
                  key={item.label}
                  href={item.href || '#'}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    !sidebarOpen && 'justify-center px-0',
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <span className="relative">
                    {item.icon}
                    {!sidebarOpen && item.badge && item.badge > 0 ? (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    ) : null}
                  </span>
                  {sidebarOpen && (
                    <span className="flex flex-1 items-center justify-between gap-2">
                      <span>{item.label}</span>
                      {item.badge && item.badge > 0 ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      ) : null}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
