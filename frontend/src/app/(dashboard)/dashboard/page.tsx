'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart, Star, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWishlistStore } from '@/lib/stores/wishlist-store';
import { ordersApi } from '@/lib/api/modules/orders.api';
import { useHydration, formatPrice, formatDate, getOrderStatusInfo } from '@/lib/hooks';
import { OnboardingTour } from '@/components/shared/onboarding-tour';
import { dashboardTourSteps } from '@/lib/config/onboarding-steps';
import type { Order } from '@/lib/types';

/**
 * Dashboard overview — welcome, recent orders, summary, quick links
 */
export default function DashboardPage() {
  const hydrated = useHydration();
  const user = useAuthStore((s) => s.user);
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await ordersApi.getOrders({ limit: 5, sort: 'created_at', order: 'DESC' });
        setOrders(res ?? []);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = [
    {
      icon: Package,
      label: 'Tong don hang',
      value: orders.length,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      icon: Heart,
      label: 'Yeu thich',
      value: hydrated ? wishlistCount : 0,
      color: 'text-red-600 bg-red-100',
    },
    {
      icon: Star,
      label: 'Diem thuong',
      value: 0,
      color: 'text-yellow-600 bg-yellow-100',
    },
  ];

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">
          Xin chao, {hydrated ? user?.name : '...'}!
        </h1>
        <p className="text-gray-500">
          Quan ly tai khoan va don hang cua ban tai day.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent orders */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Don hang gan day</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/orders">Xem tat ca</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order) => {
                const statusInfo = getOrderStatusInfo(order.status);
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">#{order.order_number}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                      <span className="font-semibold text-sm">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              Ban chua co don hang nao
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { href: '/profile', label: 'Chinh sua ho so', icon: '👤' },
          { href: '/orders', label: 'Don hang', icon: '📦' },
          { href: '/wishlist', label: 'Yeu thich', icon: '❤️' },
          { href: '/settings', label: 'Cai dat', icon: '⚙️' },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <span className="text-2xl mb-2 block">{link.icon}</span>
                <p className="text-sm font-medium">{link.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Onboarding tour cho user moi */}
      <OnboardingTour steps={dashboardTourSteps} storageKey="onboarding.dashboard.v1" />
    </div>
  );
}
