'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/pagination';
import { ordersApi } from '@/lib/api/modules/orders.api';
import { formatPrice, formatDate, getOrderStatusInfo } from '@/lib/hooks';
import type { Order } from '@/lib/types';

/**
 * Danh sach don hang — lich su order, status badge, pagination
 */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await ordersApi.getOrders({
          page,
          limit: 10,
          sort: 'created_at',
          order: 'DESC',
        });
        setOrders((res as any).data ?? []);
        setTotalPages((res as any).pagination?.totalPages ?? 1);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Don hang cua toi</h1>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : orders.length > 0 ? (
        <>
          <div className="space-y-3">
            {orders.map((order) => {
              const statusInfo = getOrderStatusInfo(order.status);
              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Package className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              #{order.order_number}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(order.created_at)} ·{' '}
                              {order.items?.length ?? 0} san pham
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:text-right">
                          <Badge className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                          <span className="font-bold text-sm">
                            {formatPrice(order.total)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      ) : (
        <div className="text-center py-16">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">Chua co don hang nao</p>
          <Link href="/products" className="text-blue-600 hover:underline text-sm">
            Bat dau mua sam
          </Link>
        </div>
      )}
    </div>
  );
}
