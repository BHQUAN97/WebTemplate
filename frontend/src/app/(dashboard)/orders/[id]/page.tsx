'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Package, Truck, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ordersApi } from '@/lib/api/modules/orders.api';
import { formatPrice, formatDate, getOrderStatusInfo } from '@/lib/hooks';
import type { Order } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Chi tiet don hang — items, shipping, payment, status timeline, cancel
 */
export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await ordersApi.getOrder(id);
        setOrder((res as any).data ?? res);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      await ordersApi.cancelOrder(order.id, 'Khach hang yeu cau huy');
      setOrder({ ...order, status: 'CANCELLED' as any });
      setCancelConfirm(false);
    } catch {
      // Ignore
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-bold mb-4">Don hang khong ton tai</h1>
        <Button asChild>
          <Link href="/orders">Quay lai</Link>
        </Button>
      </div>
    );
  }

  const statusInfo = getOrderStatusInfo(order.status);
  const canCancel = order.status === 'PENDING';

  // Status timeline
  const timelineSteps = [
    { status: 'PENDING', label: 'Dat hang', icon: Package },
    { status: 'CONFIRMED', label: 'Xac nhan', icon: CheckCircle },
    { status: 'PROCESSING', label: 'Xu ly', icon: Package },
    { status: 'SHIPPED', label: 'Giao hang', icon: Truck },
    { status: 'DELIVERED', label: 'Hoan thanh', icon: CheckCircle },
  ];

  const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const currentIndex = statusOrder.indexOf(order.status);

  return (
    <div>
      {/* Back */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-4"
      >
        <ChevronLeft className="h-4 w-4" /> Don hang
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            Don hang #{order.order_number}
          </h1>
          <p className="text-sm text-gray-500">
            Dat ngay {formatDate(order.created_at)}
          </p>
        </div>
        <Badge className={cn(statusInfo.color, 'text-sm px-3 py-1')}>
          {statusInfo.label}
        </Badge>
      </div>

      {/* Status timeline */}
      {order.status !== 'CANCELLED' && order.status !== 'RETURNED' && (
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              {timelineSteps.map((step, i) => {
                const isCompleted = i <= currentIndex;
                const isCurrent = i === currentIndex;
                return (
                  <div
                    key={step.status}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className={cn(
                        'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1',
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-400',
                        isCurrent && 'ring-2 ring-green-300',
                      )}
                    >
                      <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <span
                      className={cn(
                        'text-xs text-center',
                        isCompleted ? 'text-green-600 font-medium' : 'text-gray-400',
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>San pham ({order.items?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 relative overflow-hidden">
                    {item.product && item.product.images?.[0] ? (
                      <Image
                        src={item.product.images[0].url}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                        Img
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product_name}</p>
                    {item.variant_name && (
                      <p className="text-xs text-gray-500">{item.variant_name}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {formatPrice(item.price)} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium text-sm">
                    {formatPrice(item.total)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Shipping */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Dia chi giao hang</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              <p className="font-medium text-gray-900">
                {order.shipping_name}
              </p>
              <p>{order.shipping_phone}</p>
              <p>
                {order.shipping_address}, {order.shipping_ward},{' '}
                {order.shipping_district}, {order.shipping_city}
              </p>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tong tien</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tam tinh</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giam gia</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Van chuyen</span>
                <span>
                  {order.shipping_fee > 0
                    ? formatPrice(order.shipping_fee)
                    : 'Mien phi'}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Tong</span>
                <span className="text-red-600">{formatPrice(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Cancel */}
          {canCancel && (
            <div>
              {cancelConfirm ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Ban co chac chan muon huy don hang nay?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleCancel}
                      disabled={cancelling}
                    >
                      {cancelling ? 'Dang huy...' : 'Xac nhan huy'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelConfirm(false)}
                    >
                      Khong
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => setCancelConfirm(true)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Huy don hang
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
