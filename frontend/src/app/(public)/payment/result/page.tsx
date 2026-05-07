'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/hooks';

/**
 * Trang Kết quả Thanh toán sau khi VNPay / MoMo / gateway khac redirect ve.
 * Doc query params tu URL, hien UI success hoac failure tuong ung.
 */
function PaymentResultContent() {
  const params = useSearchParams();
  const responseCode = params.get('vnp_ResponseCode');
  const txnRef = params.get('vnp_TxnRef');
  const vnpAmount = params.get('vnp_Amount');
  const orderInfo = params.get('vnp_OrderInfo');
  const transactionStatus = params.get('vnp_TransactionStatus');

  const isSuccess = responseCode === '00' && transactionStatus === '00';
  // VNPay truyen amount dang * 100 → chia lay VND
  const amountVnd = vnpAmount ? Number(vnpAmount) / 100 : null;

  if (isSuccess) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Thanh toán thành công!</h1>
        <p className="text-gray-500 mb-6">
          Giao dịch của bạn đã được xác nhận.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left space-y-2 text-sm">
          {txnRef && (
            <div className="flex justify-between">
              <span className="text-gray-500">Mã giao dịch</span>
              <span className="font-medium text-gray-900">{txnRef}</span>
            </div>
          )}
          {amountVnd !== null && !Number.isNaN(amountVnd) && (
            <div className="flex justify-between">
              <span className="text-gray-500">Số tiền</span>
              <span className="font-semibold text-red-600">
                {formatPrice(amountVnd)}
              </span>
            </div>
          )}
          {orderInfo && (
            <div className="flex justify-between">
              <span className="text-gray-500">Nội dung</span>
              <span className="font-medium text-gray-900 text-right ml-2">
                {orderInfo}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/orders">Xem đơn hàng</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/products">Tiếp tục Mua sắm</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">Thanh toán thất bại</h1>
      <p className="text-gray-500 mb-6">
        Giao dịch không được hoàn tất. Vui lòng thử lại hoặc chọn phương thức
        khác.
      </p>

      {(responseCode || txnRef) && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left space-y-2 text-sm">
          {responseCode && (
            <div className="flex justify-between">
              <span className="text-gray-500">Mã lỗi</span>
              <span className="font-medium text-gray-900">{responseCode}</span>
            </div>
          )}
          {txnRef && (
            <div className="flex justify-between">
              <span className="text-gray-500">Mã giao dịch</span>
              <span className="font-medium text-gray-900">{txnRef}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild>
          <Link href="/checkout">Thử lại</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Page wrapper — Suspense la Bắt buộc khi dung useSearchParams o Next 16.
 */
export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="animate-pulse space-y-4">
            <div className="h-16 w-16 rounded-full bg-gray-200 mx-auto" />
            <div className="h-6 bg-gray-200 rounded w-2/3 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}
