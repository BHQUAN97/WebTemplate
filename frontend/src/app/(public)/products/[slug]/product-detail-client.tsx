'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingCart,
  Heart,
  Minus,
  Plus,
  Share2,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/shared/product-card';
import { StarRating } from '@/components/shared/star-rating';
import { useCartStore } from '@/lib/stores/cart-store';
import { useWishlistStore } from '@/lib/stores/wishlist-store';
import { productsApi } from '@/lib/api/modules/products.api';
import { reviewsApi } from '@/lib/api/modules/reviews.api';
import { formatPrice, formatDate } from '@/lib/hooks';
import type { Product, ProductVariant, Review } from '@/lib/types';

interface Props {
  slug: string;
}

/**
 * Chi tiet san pham — gallery, info, variants, tabs (description/reviews/faq)
 */
export function ProductDetailClient({ slug }: Props) {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'faq'>('description');

  const addItem = useCartStore((s) => s.addItem);
  const addWishlist = useWishlistStore((s) => s.addItem);
  const removeWishlist = useWishlistStore((s) => s.removeItem);
  const isInWishlist = useWishlistStore((s) =>
    product ? s.isInWishlist(product.id) : false,
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await productsApi.getProductBySlug(slug);
        setProduct(res);

        // Load related products
        if (res?.category_id) {
          const relRes = await productsApi.getProducts({
            limit: 4,
            search: '',
          });
          setRelated(
            (relRes ?? []).filter((p: Product) => p.id !== res.id).slice(0, 4),
          );
        }

        // Load reviews
        if (res?.id) {
          const revRes = await reviewsApi.getProductReviews(res.id);
          setReviews(revRes ?? []);
        }
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">San pham khong ton tai</h1>
        <Button asChild>
          <Link href="/products">Quay lai</Link>
        </Button>
      </div>
    );
  }

  const images = product.images ?? [];
  const hasDiscount =
    product.compare_at_price && product.compare_at_price > product.price;
  const currentPrice = selectedVariant?.price ?? product.price;
  const currentComparePrice =
    selectedVariant?.compare_at_price ?? product.compare_at_price;

  const handleAddToCart = () => {
    addItem(product, selectedVariant, quantity);
  };

  const handleToggleWishlist = () => {
    if (isInWishlist) {
      removeWishlist(product.id);
    } else {
      addWishlist(product);
    }
  };

  // Extract unique variant option keys
  const variantOptions: Record<string, string[]> = {};
  (product.variants ?? []).forEach((v) => {
    if (v.attributes) {
      Object.entries(v.attributes).forEach(([key, value]) => {
        if (!variantOptions[key]) variantOptions[key] = [];
        if (!variantOptions[key].includes(value)) {
          variantOptions[key].push(value);
        }
      });
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/products" className="hover:text-blue-600 flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> San pham
        </Link>
        <span>/</span>
        <span className="text-gray-900 truncate">{product.name}</span>
      </div>

      {/* Product main */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image gallery */}
        <div>
          <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
            {images.length > 0 ? (
              <Image
                src={images[selectedImage]?.url ?? '/placeholder-product.png'}
                alt={images[selectedImage]?.alt_text ?? product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No Image
              </div>
            )}
            {hasDiscount && (
              <Badge variant="destructive" className="absolute top-4 left-4">
                Giam {Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)}%
              </Badge>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                    selectedImage === i ? 'border-blue-600' : 'border-transparent'
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt_text ?? ''}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <StarRating rating={4} showValue />
            <span className="text-sm text-gray-500">
              ({reviews.length} danh gia)
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl sm:text-3xl font-bold text-red-600">
              {formatPrice(currentPrice)}
            </span>
            {currentComparePrice && currentComparePrice > currentPrice && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(currentComparePrice)}
              </span>
            )}
          </div>

          {/* Short description */}
          {product.short_description && (
            <p className="text-gray-600 mb-6">{product.short_description}</p>
          )}

          {/* Variant selector */}
          {Object.entries(variantOptions).map(([key, values]) => (
            <div key={key} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                {key}
              </label>
              <div className="flex flex-wrap gap-2">
                {values.map((value) => (
                  <button
                    key={value}
                    onClick={() => {
                      const variant = product.variants?.find(
                        (v) => v.attributes?.[key] === value,
                      );
                      setSelectedVariant(variant ?? null);
                    }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      selectedVariant?.attributes?.[key] === value
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quantity + Add to cart */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 hover:bg-gray-50"
                aria-label="Giam so luong"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-4 py-2 min-w-[48px] text-center font-medium">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 hover:bg-gray-50"
                aria-label="Tang so luong"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button size="lg" className="flex-1" onClick={handleAddToCart}>
              <ShoppingCart className="h-5 w-5 mr-2" />
              Them vao gio hang
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={handleToggleWishlist}
              aria-label="Yeu thich"
            >
              <Heart
                className={`h-5 w-5 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`}
              />
            </Button>
          </div>

          {/* Meta info */}
          <div className="space-y-2 text-sm text-gray-600 border-t border-gray-200 pt-4">
            {product.sku && <p>SKU: <span className="text-gray-900">{product.sku}</span></p>}
            {product.category && (
              <p>
                Danh muc:{' '}
                <Link href={`/products?category=${product.category.slug}`} className="text-blue-600 hover:underline">
                  {product.category.name}
                </Link>
              </p>
            )}
            {/* Tags: them 'tags' vao Product type neu backend ho tro */}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-12">
        <div className="flex border-b border-gray-200 gap-4 sm:gap-8 overflow-x-auto">
          {[
            { key: 'description', label: 'Mo ta' },
            { key: 'reviews', label: `Danh gia (${reviews.length})` },
            { key: 'faq', label: 'Cau hoi' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="py-6">
          {activeTab === 'description' && (
            <div
              className="prose prose-sm sm:prose max-w-none"
              dangerouslySetInnerHTML={{ __html: product.description ?? '' }}
            />
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">
                            {review.user?.name ?? 'Khach hang'}
                          </p>
                          <StarRating rating={review.rating} size="sm" />
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                      {review.title && (
                        <p className="font-medium mb-1">{review.title}</p>
                      )}
                      {review.comment && (
                        <p className="text-sm text-gray-600">{review.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Chua co danh gia nao
                </p>
              )}
            </div>
          )}

          {activeTab === 'faq' && (
            <p className="text-center text-gray-500 py-8">
              Chua co cau hoi nao cho san pham nay
            </p>
          )}
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-6">San pham lien quan</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
