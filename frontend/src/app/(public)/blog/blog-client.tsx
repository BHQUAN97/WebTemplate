'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/pagination';
import { articlesApi } from '@/lib/api/modules/articles.api';
import { categoriesApi } from '@/lib/api/modules/categories.api';
import { formatDate, getReadingTime } from '@/lib/hooks';
import type { Article, Category, PaginationParams } from '@/lib/types';

/**
 * Trang danh sach blog — featured article, grid, category filter
 */
export function BlogClient() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page, limit: 9 };
        if (selectedCategory) params.category = selectedCategory;
        const res = await articlesApi.getPublished(params as PaginationParams);
        setArticles(res ?? []);
      } catch {
        setArticles([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, selectedCategory]);

  useEffect(() => {
    categoriesApi.getCategories({ limit: 20 }).then((res) => {
      setCategories(res ?? []);
    }).catch(() => {});
  }, []);

  const featured = articles[0];
  const gridArticles = articles.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8">Blog</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="aspect-[2/1] rounded-xl" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video rounded-xl" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : articles.length > 0 ? (
            <>
              {/* Featured article */}
              {featured && page === 1 && (
                <Link href={`/blog/${featured.slug}`} className="block group mb-8">
                  <div className="relative aspect-[2/1] rounded-xl overflow-hidden bg-gray-100 mb-4">
                    {featured.featured_image ? (
                      <Image
                        src={featured.featured_image}
                        alt={featured.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 1024px) 100vw, 70vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        Featured Image
                      </div>
                    )}
                  </div>
                  <Badge className="mb-2">Noi bat</Badge>
                  <h2 className="text-xl sm:text-2xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{featured.author?.name ?? 'Admin'}</span>
                    <span>{featured.published_at ? formatDate(featured.published_at) : ''}</span>
                    <span>{getReadingTime(featured.content)} phut doc</span>
                  </div>
                </Link>
              )}

              {/* Article grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {gridArticles.map((article) => (
                  <Link key={article.id} href={`/blog/${article.slug}`} className="group block">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 mb-3">
                      {article.featured_image ? (
                        <Image
                          src={article.featured_image}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                          Image
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-gray-500 text-xs sm:text-sm line-clamp-2 mb-2">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{article.author?.name ?? 'Admin'}</span>
                      <span>
                        {article.published_at ? formatDate(article.published_at) : ''}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          ) : (
            <p className="text-center text-gray-500 py-16">Chua co bai viet nao</p>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-56 flex-shrink-0">
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
        </aside>
      </div>
    </div>
  );
}
