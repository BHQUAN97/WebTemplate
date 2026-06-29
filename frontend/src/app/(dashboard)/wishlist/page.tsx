'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/lib/hooks/use-toast';
import { wishlistApi, type WishlistItem } from '@/lib/api/modules/wishlist.api';
import { useCartStore } from '@/lib/stores/cart-store';
import type { Product } from '@/lib/types';

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const { toast } = useToast();
  const addToCart = useCartStore((s) => s.addItem);


  useEffect(() => {
    wishlistApi.getWishlist()
      .then((res) => setItems((res as any)?.data ?? res ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const handleRemove = async (productId: string) => {
    setRemoving(productId);
    try {
      await wishlistApi.remove(productId);
      setItems((prev) => prev.filter((i) => i.product_id !== productId));
      toast('Đã xóa khỏi danh sách yêu thích');
    } catch {
      toast('Không thể xóa', undefined, 'destructive');
    } finally {
      setRemoving(null);
    }
  };

  const handleAddToCart = (item: WishlistItem) => {
    if (!item.product) return;
    // Tạo Product shape tối giản để pass vào cart store
    const product = {
      id: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      price: item.product.price,
      compare_at_price: item.product.compare_at_price,
      images: item.product.images,
    } as unknown as Product;
    addToCart(product, null, 1);
    toast(`Đã thêm "${item.product.name}" vào giỏ hàng`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Sản phẩm yêu thích</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Sản phẩm yêu thích</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Heart className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            Chưa có sản phẩm yêu thích
          </h2>
          <p className="text-gray-400 mb-6">
            Thêm sản phẩm vào danh sách để xem lại sau.
          </p>
          <Button asChild>
            <Link href="/products">Khám phá sản phẩm</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sản phẩm yêu thích</h1>
        <span className="text-sm text-gray-500">{items.length} sản phẩm</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="aspect-square bg-gray-100 relative">
              {item.product?.images?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.product.images[0].url}
                  alt={item.product.images[0].alt || item.product.name}
                  className="w-full h-full object-cover"
                />
              )}
              {item.product && !item.product.is_active && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-medium">Hết hàng</span>
                </div>
              )}
            </div>
            <CardContent className="p-4 space-y-3">
              {item.product ? (
                <>
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="font-medium hover:text-blue-600 line-clamp-2 block"
                  >
                    {item.product.name}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-red-600">
                      {formatPrice(item.product.price)}
                    </span>
                    {item.product.compare_at_price && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(item.product.compare_at_price)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAddToCart(item)}
                      disabled={!item.product.is_active}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Thêm vào giỏ
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemove(item.product_id)}
                      disabled={removing === item.product_id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-400">Sản phẩm không còn tồn tại</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
