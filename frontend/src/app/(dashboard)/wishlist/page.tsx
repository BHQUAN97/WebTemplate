'use client';

import { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface WishlistItem {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compare_at_price: number | null;
    images: { url: string; alt: string }[];
    is_active: boolean;
  };
  added_at: string;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: fetch wishlist from API
    setLoading(false);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    // TODO: call API to remove
  };

  const addToCart = (productId: string) => {
    // TODO: add to cart via store
    console.log('Add to cart:', productId);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">San pham yeu thich</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">San pham yeu thich</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Heart className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Chua co san pham yeu thich</h2>
          <p className="text-gray-400 mb-6">Hay them san pham vao danh sach yeu thich de xem lai sau.</p>
          <Button asChild>
            <a href="/products">Kham pha san pham</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">San pham yeu thich</h1>
        <span className="text-sm text-gray-500">{items.length} san pham</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <Card key={item.id} className="overflow-hidden">
            <div className="aspect-square bg-gray-100 relative">
              {item.product.images?.[0] && (
                <img
                  src={item.product.images[0].url}
                  alt={item.product.images[0].alt || item.product.name}
                  className="w-full h-full object-cover"
                />
              )}
              {!item.product.is_active && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-medium">Het hang</span>
                </div>
              )}
            </div>
            <CardContent className="p-4 space-y-3">
              <a href={`/products/${item.product.slug}`} className="font-medium hover:text-blue-600 line-clamp-2">
                {item.product.name}
              </a>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-red-600">{formatPrice(item.product.price)}</span>
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
                  onClick={() => addToCart(item.product.id)}
                  disabled={!item.product.is_active}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Them vao gio
                </Button>
                <Button size="sm" variant="outline" onClick={() => removeItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
