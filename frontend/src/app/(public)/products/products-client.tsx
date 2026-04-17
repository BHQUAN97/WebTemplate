'use client';

import { useState, useEffect, useCallback } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/shared/product-card';
import { Pagination } from '@/components/shared/pagination';
import { productsApi } from '@/lib/api/modules/products.api';
import { categoriesApi } from '@/lib/api/modules/categories.api';
import { useDebounce, useMediaQuery } from '@/lib/hooks';
import type { Product, Category } from '@/lib/types';

const sortOptions = [
  { value: 'newest', label: 'Moi nhat' },
  { value: 'price_asc', label: 'Gia thap den cao' },
  { value: 'price_desc', label: 'Gia cao den thap' },
  { value: 'popular', label: 'Pho bien' },
  { value: 'rating', label: 'Danh gia cao' },
];

/**
 * Trang danh sach san pham — filter, sort, pagination
 */
export function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[string, string]>(['', '']);
  const [filterOpen, setFilterOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const debouncedSearch = useDebounce(search, 400);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        limit: 12,
        search: debouncedSearch || undefined,
        sort: sortBy === 'newest' ? 'created_at' : sortBy === 'popular' ? 'view_count' : 'price',
        order: sortBy === 'price_desc' ? 'DESC' : sortBy === 'price_asc' ? 'ASC' : 'DESC',
      };
      if (selectedCategory) params.category = selectedCategory;
      if (priceRange[0]) params.min_price = priceRange[0];
      if (priceRange[1]) params.max_price = priceRange[1];

      const res = await productsApi.getProducts(params);
      setProducts(res ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, sortBy, selectedCategory, priceRange]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    categoriesApi.getCategoryTree().then((res) => {
      setCategories(res ?? []);
    }).catch(() => {});
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setPriceRange(['', '']);
    setSearch('');
    setPage(1);
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Danh muc</h3>
        <div className="space-y-2">
          <button
            onClick={() => { setSelectedCategory(''); setPage(1); }}
            className={`block text-sm w-full text-left px-2 py-1.5 rounded ${!selectedCategory ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Tat ca
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.slug); setPage(1); }}
              className={`block text-sm w-full text-left px-2 py-1.5 rounded ${selectedCategory === cat.slug ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Khoang gia</h3>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            placeholder="Tu"
            value={priceRange[0]}
            onChange={(e) => { setPriceRange([e.target.value, priceRange[1]]); setPage(1); }}
            className="text-sm"
          />
          <span className="text-gray-400">-</span>
          <Input
            type="number"
            placeholder="Den"
            value={priceRange[1]}
            onChange={(e) => { setPriceRange([priceRange[0], e.target.value]); setPage(1); }}
            className="text-sm"
          />
        </div>
      </div>

      {/* Clear filters */}
      <Button variant="outline" size="sm" className="w-full" onClick={clearFilters}>
        Xoa bo loc
      </Button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">San pham</h1>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Tim kiem san pham..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full sm:w-64"
          />
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {isMobile && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setFilterOpen(true)}
              aria-label="Bo loc"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar filter */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          <FilterContent />
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">Khong tim thay san pham nao</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Xoa bo loc
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter bottom sheet */}
      {filterOpen && isMobile && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFilterOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Bo loc</h2>
              <Button variant="ghost" size="icon" onClick={() => setFilterOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <FilterContent />
            <Button className="w-full mt-4" onClick={() => setFilterOpen(false)}>
              Ap dung
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
