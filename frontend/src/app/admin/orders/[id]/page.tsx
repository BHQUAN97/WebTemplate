'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer, Truck, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { PrintButton } from '@/components/shared/print-button';
import { ExportButton, type ExportFormat } from '@/components/shared/export-button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { formatPrice, formatDate, formatDateTime, formatOrderStatus, formatPaymentStatus } from '@/lib/utils/format';
import type { ApiResponse, Order, OrderStatus } from '@/lib/types';

const ORDER_STATUSES: { value: string; label: string }[] = [
  { value: 'PENDING', label: 'Cho xac nhan' },
  { value: 'CONFIRMED', label: 'Da xac nhan' },
  { value: 'PROCESSING', label: 'Dang xu ly' },
  { value: 'SHIPPED', label: 'Dang giao hang' },
  { value: 'DELIVERED', label: 'Da giao' },
  { value: 'CANCELLED', label: 'Da huy' },
  { value: 'REFUNDED', label: 'Da hoan tien' },
];

/** Chi tiet don hang */
export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [newStatus, setNewStatus] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { data, loading, refetch } = useApi<ApiResponse<Order>>(`/admin/orders/${id}`);
  const order = data?.data;

  const statusMutation = useMutation('PATCH', `/admin/orders/${id}/status`);
  const cancelMutation = useMutation('PATCH', `/admin/orders/${id}/cancel`);

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    await statusMutation.mutate({ status: newStatus });
    refetch();
  };

  const handleCancel = async () => {
    await cancelMutation.mutate({ reason: cancelReason });
    setShowCancel(false);
    setCancelReason('');
    refetch();
  };

  const handleExport = (format: ExportFormat) => {
    // Export don hang
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-xl lg:col-span-2" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Khong tim thay don hang</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        title={`Chi tiet don hang #${order.order_number}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Don hang', href: '/admin/orders' },
          { label: order.order_number },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <PrintButton />
            <ExportButton onExport={handleExport} formats={['pdf']} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thong tin don hang */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Thong tin don hang</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Ma don</p>
                <p className="font-medium">{order.order_number}</p>
              </div>
              <div>
                <p className="text-gray-500">Ngay dat</p>
                <p className="font-medium">{formatDateTime(order.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500">Trang thai</p>
                <StatusBadge status={order.status} label={formatOrderStatus(order.status)} />
              </div>
              <div>
                <p className="text-gray-500">Thanh toan</p>
                <StatusBadge
                  status={order.payment?.status ?? 'PENDING'}
                  label={formatPaymentStatus(order.payment?.status ?? 'PENDING')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thong tin khach hang */}
        <Card>
          <CardHeader><CardTitle>Khach hang</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><span className="text-gray-500">Ten:</span> {order.user?.name ?? order.shipping_name}</p>
            <p><span className="text-gray-500">Email:</span> {order.user?.email ?? '---'}</p>
            <p><span className="text-gray-500">SDT:</span> {order.shipping_phone}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bang san pham */}
      <Card>
        <CardHeader><CardTitle>San pham</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Anh</TableHead>
                <TableHead>San pham</TableHead>
                <TableHead>Bien the</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Don gia</TableHead>
                <TableHead className="text-right">SL</TableHead>
                <TableHead className="text-right">Thanh tien</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="h-10 w-10 rounded bg-gray-100 overflow-hidden">
                      {item.product?.images?.[0] ? (
                        <img src={item.product.images[0].url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">N/A</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell>{item.variant_name ?? '---'}</TableCell>
                  <TableCell className="text-gray-500">{item.sku ?? '---'}</TableCell>
                  <TableCell className="text-right">{formatPrice(item.price)}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-medium">{formatPrice(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tong ket don hang */}
        <Card>
          <CardHeader><CardTitle>Tong ket</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Tam tinh</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Giam gia</span>
                <span className="text-red-600">-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Phi van chuyen</span>
              <span>{formatPrice(order.shipping_fee)}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Thue</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between font-bold text-base">
              <span>Tong cong</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Dia chi giao hang */}
        <Card>
          <CardHeader><CardTitle>Dia chi giao hang</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{order.shipping_name}</p>
            <p>{order.shipping_phone}</p>
            <p>{order.shipping_address}</p>
            <p>{[order.shipping_ward, order.shipping_district, order.shipping_city].filter(Boolean).join(', ')}</p>
            {order.note && (
              <div className="mt-3 p-2 bg-yellow-50 rounded text-yellow-800 text-xs">
                <strong>Ghi chu:</strong> {order.note}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cap nhat trang thai */}
        <Card className="print:hidden">
          <CardHeader><CardTitle>Cap nhat trang thai</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Chon trang thai moi" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              disabled={!newStatus || statusMutation.loading}
              onClick={handleStatusUpdate}
            >
              <Truck className="h-4 w-4 mr-2" />
              {statusMutation.loading ? 'Dang cap nhat...' : 'Cap nhat'}
            </Button>

            {order.status === 'PENDING' && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowCancel(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Huy don hang
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lich su trang thai */}
      <Card>
        <CardHeader><CardTitle>Lich su trang thai</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
              <div>
                <p className="font-medium text-sm">{formatOrderStatus(order.status)}</p>
                <p className="text-xs text-gray-500">{formatDateTime(order.updated_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-gray-300" />
              <div>
                <p className="font-medium text-sm">Don hang duoc tao</p>
                <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog huy don */}
      <ConfirmDialog
        open={showCancel}
        onOpenChange={setShowCancel}
        title="Huy don hang"
        description="Ban co chac chan muon huy don hang nay?"
        onConfirm={handleCancel}
        confirmLabel="Huy don"
        variant="danger"
        loading={cancelMutation.loading}
      />

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:space-y-4 > * + * { margin-top: 1rem; }
        }
      `}</style>
    </div>
  );
}
