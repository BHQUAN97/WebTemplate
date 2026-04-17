'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useCartStore } from '@/lib/stores/cart-store';
import { useHydration, formatPrice } from '@/lib/hooks';
import { shippingSchema, type ShippingFormData } from '@/lib/validations';
import { ordersApi } from '@/lib/api/modules/orders.api';
import { cn } from '@/lib/utils';

type Step = 'shipping' | 'payment' | 'review';
type PaymentMethod = 'cod' | 'bank_transfer' | 'vnpay' | 'momo';

const paymentMethods = [
  { id: 'cod' as const, label: 'Thanh toan khi nhan hang (COD)', icon: Banknote },
  { id: 'bank_transfer' as const, label: 'Chuyen khoan ngan hang', icon: CreditCard },
  { id: 'vnpay' as const, label: 'VNPay', icon: CreditCard },
  { id: 'momo' as const, label: 'MoMo', icon: Smartphone },
];

/**
 * Trang thanh toan — 3 buoc: Shipping -> Payment -> Review
 */
export function CheckoutClient() {
  const hydrated = useHydration();
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getTotal = useCartStore((s) => s.getTotal);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const clearCart = useCartStore((s) => s.clearCart);

  const [step, setStep] = useState<Step>('shipping');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [shippingData, setShippingData] = useState<ShippingFormData | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
  });

  const steps: { key: Step; label: string }[] = [
    { key: 'shipping', label: 'Giao hang' },
    { key: 'payment', label: 'Thanh toan' },
    { key: 'review', label: 'Xac nhan' },
  ];

  const onShippingSubmit = (data: ShippingFormData) => {
    setShippingData(data);
    setStep('payment');
  };

  const onPaymentSelect = () => {
    setStep('review');
  };

  const onPlaceOrder = async () => {
    if (!shippingData) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await ordersApi.createOrder({
        items: items.map((item) => ({
          product_id: item.product.id,
          variant_id: item.variant?.id,
          quantity: item.quantity,
        })),
        shipping_name: shippingData.name,
        shipping_phone: shippingData.phone,
        shipping_address: shippingData.address,
        shipping_city: shippingData.city,
        shipping_district: shippingData.district,
        shipping_ward: shippingData.ward,
        payment_method: paymentMethod,
      });

      setOrderNumber(res.order_number);
      setOrderSuccess(true);
      clearCart();
    } catch (err: any) {
      setSubmitError(err.message || 'Dat hang that bai, vui long thu lai');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated) return null;

  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Gio hang trong</h1>
        <Button asChild>
          <Link href="/products">Tiep tuc mua sam</Link>
        </Button>
      </div>
    );
  }

  // Success page
  if (orderSuccess) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Dat hang thanh cong!</h1>
        <p className="text-gray-500 mb-2">
          Ma don hang: <span className="font-semibold text-gray-900">{orderNumber}</span>
        </p>
        <p className="text-gray-500 mb-6">
          Chung toi se gui email xac nhan don hang cua ban.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/orders">Xem don hang</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/products">Tiep tuc mua sam</Link>
          </Button>
        </div>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const total = getTotal();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Thanh toan</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium flex-shrink-0',
                step === s.key
                  ? 'bg-blue-600 text-white'
                  : steps.indexOf(steps.find((x) => x.key === step)!) > i
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500',
              )}
            >
              {i + 1}
            </div>
            <span className="ml-2 text-sm font-medium whitespace-nowrap mr-4">
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="w-8 h-px bg-gray-300 mr-2" />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Shipping step */}
          {step === 'shipping' && (
            <form onSubmit={handleSubmit(onShippingSubmit)} className="space-y-4">
              <h2 className="text-lg font-bold mb-4">Thong tin giao hang</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ho ten nguoi nhan *
                  </label>
                  <Input {...register('name')} placeholder="Nhap ho ten" />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    So dien thoai *
                  </label>
                  <Input {...register('phone')} placeholder="0900 123 456" />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dia chi *
                </label>
                <Input {...register('address')} placeholder="So nha, duong" />
                {errors.address && (
                  <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tinh/Thanh pho *
                  </label>
                  <Input {...register('city')} placeholder="Chon tinh/thanh" />
                  {errors.city && (
                    <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quan/Huyen *
                  </label>
                  <Input {...register('district')} placeholder="Chon quan/huyen" />
                  {errors.district && (
                    <p className="text-red-500 text-xs mt-1">{errors.district.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phuong/Xa *
                  </label>
                  <Input {...register('ward')} placeholder="Chon phuong/xa" />
                  {errors.ward && (
                    <p className="text-red-500 text-xs mt-1">{errors.ward.message}</p>
                  )}
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full sm:w-auto">
                Tiep tuc
              </Button>
            </form>
          )}

          {/* Payment step */}
          {step === 'payment' && (
            <div>
              <h2 className="text-lg font-bold mb-4">Phuong thuc thanh toan</h2>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors text-left',
                      paymentMethod === method.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <method.icon className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-sm">{method.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep('shipping')}>
                  Quay lai
                </Button>
                <Button onClick={onPaymentSelect}>Tiep tuc</Button>
              </div>
            </div>
          )}

          {/* Review step */}
          {step === 'review' && (
            <div>
              <h2 className="text-lg font-bold mb-4">Xac nhan don hang</h2>

              {/* Shipping info */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Dia chi giao hang</h3>
                    <button
                      onClick={() => setStep('shipping')}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Thay doi
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {shippingData?.name} - {shippingData?.phone}
                    <br />
                    {shippingData?.address}, {shippingData?.ward},{' '}
                    {shippingData?.district}, {shippingData?.city}
                  </p>
                </CardContent>
              </Card>

              {/* Payment method */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Thanh toan</h3>
                    <button
                      onClick={() => setStep('payment')}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Thay doi
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {paymentMethods.find((m) => m.id === paymentMethod)?.label}
                  </p>
                </CardContent>
              </Card>

              {/* Items */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3">
                    San pham ({items.length})
                  </h3>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={`${item.product.id}-${item.variant?.id ?? ''}`}
                        className="flex items-center gap-3"
                      >
                        <div className="w-12 h-12 rounded bg-gray-100 flex-shrink-0 relative overflow-hidden">
                          <Image
                            src={item.product.images?.[0]?.url ?? '/placeholder-product.png'}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            x{item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-medium">
                          {formatPrice(
                            (item.variant?.price ?? item.product.price) * item.quantity,
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {submitError && (
                <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
                  {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('payment')}>
                  Quay lai
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={onPlaceOrder}
                  disabled={submitting}
                >
                  {submitting ? 'Dang xu ly...' : 'Dat hang'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary sidebar */}
        <div>
          <Card className="sticky top-20">
            <CardContent className="p-4 sm:p-6 space-y-3">
              <h2 className="font-bold">Tong don hang</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tam tinh</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giam gia</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Van chuyen</span>
                  <span className="text-green-600">Mien phi</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>Tong</span>
                  <span className="text-red-600">{formatPrice(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
