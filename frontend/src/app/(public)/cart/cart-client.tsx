'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useCartStore } from '@/lib/stores/cart-store';
import { useHydration, formatPrice } from '@/lib/hooks';
import { promoCodeSchema, type PromoCodeFormData } from '@/lib/validations';
import { cartApi } from '@/lib/api/modules/cart.api';

/**
 * Trang gio hang — danh sach items, promo code, tong tien
 */
export function CartClient() {
  const hydrated = useHydration();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getTotal = useCartStore((s) => s.getTotal);
  const promoCode = useCartStore((s) => s.promoCode);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const setPromoCode = useCartStore((s) => s.setPromoCode);

  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  // Track key cua item dang update qty de disable button trong qua trinh xu ly
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  /**
   * Wrap updateQuantity voi loading state ngan — chong double-click
   * va cho user feedback truc quan tren mobile.
   */
  const handleQuantityChange = async (
    productId: string,
    variantId: string | null,
    nextQty: number,
  ) => {
    const key = `${productId}-${variantId ?? 'default'}`;
    setUpdatingKey(key);
    try {
      updateQuantity(productId, variantId, nextQty);
    } finally {
      // Nho de user thay disabled — UX feedback
      setTimeout(() => setUpdatingKey(null), 150);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PromoCodeFormData>({
    resolver: zodResolver(promoCodeSchema),
  });

  const onApplyPromo = async (data: PromoCodeFormData) => {
    setPromoError('');
    setPromoLoading(true);
    try {
      const res = await cartApi.applyPromo(data.code);
      setPromoCode(data.code, res.discount);
    } catch (err: any) {
      setPromoError(err.message || 'Ma giam gia khong hop le');
    } finally {
      setPromoLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Gio hang</h1>
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <ShoppingBag
          className="h-16 w-16 text-gray-300 mx-auto mb-4"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-bold mb-2">Gio hang trong</h1>
        <p className="text-gray-500 mb-6">
          Ban chua co san pham nao trong gio hang
        </p>
        <Button asChild>
          <Link href="/products">Tiep tuc mua sam</Link>
        </Button>
      </div>
    );
  }

  const shippingFee = 0; // Mien phi
  const subtotal = getSubtotal();
  const total = getTotal() + shippingFee;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">
        Gio hang ({items.length} san pham)
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const imageUrl = item.product.images?.[0]?.url ?? '/placeholder-product.png';
            const price = item.variant?.price ?? item.product.price;
            const itemKey = `${item.product.id}-${item.variant?.id ?? 'default'}`;
            const isUpdating = updatingKey === itemKey;

            return (
              <Card key={`${item.product.id}-${item.variant?.id ?? 'default'}`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex gap-3 sm:gap-4">
                    {/* Image */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image
                        src={imageUrl}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="font-medium text-sm sm:text-base hover:text-blue-600 line-clamp-1"
                          >
                            {item.product.name}
                          </Link>
                          {item.variant && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.variant.name}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id, item.variant?.id ?? null)}
                          className="p-1 text-gray-400 hover:text-red-500"
                          aria-label="Xoa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity */}
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            onClick={() =>
                              handleQuantityChange(
                                item.product.id,
                                item.variant?.id ?? null,
                                item.quantity - 1,
                              )
                            }
                            disabled={isUpdating || item.quantity <= 1}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Giam"
                          >
                            <Minus className="h-3 w-3" aria-hidden="true" />
                          </button>
                          <span className="px-3 text-sm font-medium min-w-[32px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              handleQuantityChange(
                                item.product.id,
                                item.variant?.id ?? null,
                                item.quantity + 1,
                              )
                            }
                            disabled={isUpdating}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Tang"
                          >
                            <Plus className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </div>

                        {/* Price */}
                        <p className="font-bold text-red-600">
                          {formatPrice(price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-20">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <h2 className="font-bold text-lg">Tong don hang</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tam tinh</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giam gia ({promoCode})</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Van chuyen</span>
                  <span className="text-green-600">Mien phi</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-base">
                  <span>Tong</span>
                  <span className="text-red-600">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Promo code */}
              <form
                onSubmit={handleSubmit(onApplyPromo)}
                className="flex gap-2"
              >
                <Input
                  {...register('code')}
                  placeholder="Ma giam gia"
                  className="text-sm"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={promoLoading}
                >
                  Ap dung
                </Button>
              </form>
              {errors.code && (
                <p className="text-red-500 text-xs">{errors.code.message}</p>
              )}
              {promoError && (
                <p className="text-red-500 text-xs">{promoError}</p>
              )}

              <Button className="w-full" size="lg" asChild>
                <Link href="/checkout">Thanh toan</Link>
              </Button>

              <Link
                href="/products"
                className="block text-center text-sm text-blue-600 hover:underline"
              >
                Tiep tuc mua sam
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
