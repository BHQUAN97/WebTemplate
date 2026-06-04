'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Truck,
  Headphones,
  RotateCcw,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ProductCard } from '@/components/shared/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { newsletterSchema, type NewsletterFormData } from '@/lib/validations';
import { productsApi } from '@/lib/api/modules/products.api';
import { categoriesApi } from '@/lib/api/modules/categories.api';
import type { Product, Category } from '@/lib/types';
import { siteConfig } from '@/config/site.config';

const features = [
  { icon: Truck, title: 'Miễn phí vận chuyển', desc: 'Cho đơn hàng từ 500K' },
  { icon: Headphones, title: 'Hỗ trợ 24/7', desc: 'Luôn sẵn sàng giúp bạn' },
  { icon: RotateCcw, title: 'Hoàn tiền 30 ngày', desc: 'Bảo đảm hài lòng' },
  { icon: ShieldCheck, title: 'Thanh toán an toàn', desc: 'Bảo mật tuyệt đối' },
];

const testimonials = [
  { name: 'Nguyễn Văn A', rating: 5, text: 'Sản phẩm chất lượng, giao hàng nhanh. Rất hài lòng với dịch vụ.' },
  { name: 'Trần Thị B', rating: 5, text: 'Giá cả hợp lý, nhân viên tư vấn nhiệt tình. Sẽ quay lại mua hàng.' },
  { name: 'Lê Văn C', rating: 4, text: 'Đóng gói cẩn thận, sản phẩm đúng mô tả. Tôi sẽ giới thiệu cho bạn bè.' },
  { name: 'Phạm Thị D', rating: 5, text: 'Dịch vụ khách hàng tuyệt vời, xử lý đổi trả nhanh chóng.' },
];

/**
 * Landing page client — interactive sections
 */
export function LandingClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [newsletterSent, setNewsletterSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterSchema),
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          productsApi.getFeatured(),
          categoriesApi.getCategoryTree(),
        ]);
        setProducts(productsRes?.slice(0, 8) ?? []);
        setCategories(categoriesRes?.slice(0, 6) ?? []);
      } catch {
        // Fallback: khong co data
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const onSubmitNewsletter = async () => {
    setNewsletterSent(true);
    reset();
  };

  const nextTestimonial = () =>
    setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
  const prevTestimonial = () =>
    setTestimonialIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length,
    );

  return (
    <div>
      {/* === HERO === */}
      {siteConfig.sections.hero && (
        <section className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">
                  Mua sắm trực tuyến
                  <br />
                  <span className="text-blue-200">Dễ dàng & Nhanh chóng</span>
                </h1>
                <p className="text-lg text-blue-100 mb-8 max-w-lg">
                  Khám phá hàng nghìn sản phẩm chất lượng cao với giá tốt nhất.
                  Giao hàng nhanh, hỗ trợ 24/7.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-blue-50"
                    asChild
                  >
                    <Link href="/products">Mua sắm ngay</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10"
                    asChild
                  >
                    <Link href="/about">Tìm hiểu thêm</Link>
                  </Button>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="relative w-full aspect-square max-w-md mx-auto rounded-2xl bg-blue-500/30 flex items-center justify-center">
                  <span className="text-blue-200 text-lg">Hero Image</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* === FEATURES === */}
      {siteConfig.sections.features && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="text-center p-4 sm:p-6">
                  <CardContent className="p-0">
                    <feature.icon className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 mx-auto mb-3" />
                    <h3 className="text-sm sm:text-base font-semibold mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {feature.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* === FEATURED PRODUCTS === */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold">Sản phẩm noi bat</h2>
            <Link
              href="/products"
              className="text-sm text-blue-600 hover:underline"
            >
              Xem tat ca
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-12">
              Chua co Sản phẩm noi bat
            </p>
          )}
        </div>
      </section>

      {/* === CATEGORIES === */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center">
            Danh mục sản phẩm
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.slug}`}
                  className="group relative overflow-hidden rounded-xl bg-gray-100 aspect-square flex items-center justify-center hover:shadow-lg transition-shadow"
                >
                  {cat.image_url ? (
                    <Image
                      src={cat.image_url}
                      alt={cat.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="(max-width: 640px) 50vw, 16vw"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm sm:text-base text-center px-2">
                      {cat.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">Chua co Danh mục</p>
          )}
        </div>
      </section>

      {/* === TESTIMONIALS === */}
      {siteConfig.sections.testimonials && (
        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-8">
              Khách hang noi gi
            </h2>

            <div className="relative">
              <Card className="p-6 sm:p-8">
                <CardContent className="p-0">
                  <div className="flex justify-center mb-4">
                    {Array.from({ length: testimonials[testimonialIndex].rating }).map(
                      (_, i) => (
                        <Star
                          key={i}
                          className="h-5 w-5 fill-yellow-400 text-yellow-400"
                        />
                      ),
                    )}
                  </div>
                  <p className="text-gray-700 mb-4 text-sm sm:text-base italic">
                    &ldquo;{testimonials[testimonialIndex].text}&rdquo;
                  </p>
                  <p className="font-semibold text-gray-900">
                    {testimonials[testimonialIndex].name}
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-center gap-4 mt-4">
                <Button variant="outline" size="icon" onClick={prevTestimonial}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextTestimonial}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* === STATS === */}
      {siteConfig.sections.stats && (
        <section className="py-12 sm:py-16 bg-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-3xl sm:text-4xl font-bold">1000+</p>
                <p className="text-blue-200 mt-1">Sản phẩm</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-bold">5000+</p>
                <p className="text-blue-200 mt-1">Khách hang</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-3xl sm:text-4xl font-bold">50+</p>
                <p className="text-blue-200 mt-1">Danh mục</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* === NEWSLETTER === */}
      {siteConfig.features.newsletter && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Đăng ký nhan tin
            </h2>
            <p className="text-gray-500 mb-6">
              Nhan thong tin Khuyến mãi va Sản phẩm moi nhat qua email
            </p>

            {newsletterSent ? (
              <div className="bg-green-50 text-green-700 rounded-lg p-4">
                Cam on ban da Đăng ký! Chung toi se gui email som nhat.
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmitNewsletter)}
                className="flex flex-col sm:flex-row gap-3"
              >
                <div className="flex-1">
                  <Input
                    {...register('email')}
                    placeholder="Nháp email cua ban"
                    type="email"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1 text-left">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  Đăng ký
                </Button>
              </form>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
