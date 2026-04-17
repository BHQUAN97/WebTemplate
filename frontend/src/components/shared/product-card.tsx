'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/lib/stores/cart-store';
import { useWishlistStore } from '@/lib/stores/wishlist-store';
import { formatPrice, getStarArray } from '@/lib/hooks';
import type { Product } from '@/lib/types';

interface ProductCardProps {
  product: Product;
}

/**
 * Card san pham — hien thi trong grid, co add to cart + wishlist
 */
export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const addWishlist = useWishlistStore((s) => s.addItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist(product.id));
  const removeWishlist = useWishlistStore((s) => s.removeItem);

  const imageUrl = product.images?.[0]?.url ?? '/placeholder-product.png';
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product, null, 1);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isInWishlist) {
      removeWishlist(product.id);
    } else {
      addWishlist(product);
    }
  };

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg">
        {/* Image */}
        <div className="relative aspect-square bg-gray-100">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {hasDiscount && (
            <Badge variant="destructive" className="absolute top-2 left-2">
              -{Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)}%
            </Badge>
          )}

          {/* Wishlist button */}
          <button
            onClick={handleToggleWishlist}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
            aria-label="Yeu thich"
          >
            <Heart
              className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
            />
          </button>
        </div>

        {/* Info */}
        <div className="p-3 sm:p-4">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
            {product.name}
          </h3>

          {/* Rating */}
          {product.category && (
            <p className="text-xs text-gray-500 mb-2">{product.category.name}</p>
          )}

          {/* Price */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base font-bold text-red-600">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.compare_at_price!)}
              </span>
            )}
          </div>

          {/* Add to cart */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Them vao gio
          </Button>
        </div>
      </div>
    </Link>
  );
}
