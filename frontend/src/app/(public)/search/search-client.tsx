'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { searchApi, type SearchResult } from '@/lib/api/modules/search.api';
import { useDebounce, formatPrice } from '@/lib/hooks';

/**
 * Trang tim kiem — tabs All/Products/Articles, result cards
 */
export function SearchClient() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'product' | 'article'>('all');
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    async function search() {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { limit: 20 };
        if (activeTab !== 'all') params.type = activeTab;
        const res = await searchApi.search(debouncedQuery, params);
        setResults(res ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    search();
  }, [debouncedQuery, activeTab]);

  const filteredResults =
    activeTab === 'all'
      ? results
      : results.filter((r) => r.type === activeTab);

  const tabs = [
    { key: 'all' as const, label: 'Tat ca' },
    { key: 'product' as const, label: 'San pham' },
    { key: 'article' as const, label: 'Bai viet' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Tim kiem</h1>

      {/* Search input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhap tu khoa tim kiem..."
          className="pl-10 h-12 text-base"
          autoFocus
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {!debouncedQuery.trim() ? (
        <div className="text-center text-gray-400 py-16">
          <Search className="h-12 w-12 mx-auto mb-4" />
          <p>Nhap tu khoa de bat dau tim kiem</p>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-20 h-20 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="space-y-4">
          {filteredResults.map((result) => (
            <Link
              key={`${result.type}-${result.id}`}
              href={
                result.type === 'product'
                  ? `/products/${result.slug}`
                  : `/blog/${result.slug}`
              }
              className="flex gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 flex-shrink-0 relative overflow-hidden">
                {result.image ? (
                  <Image
                    src={result.image}
                    alt={result.title}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                    No img
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant={result.type === 'product' ? 'default' : 'secondary'}
                  >
                    {result.type === 'product' ? 'San pham' : 'Bai viet'}
                  </Badge>
                  {result.category && (
                    <span className="text-xs text-gray-400">
                      {result.category}
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-sm sm:text-base line-clamp-1">
                  {result.title}
                </h3>
                {result.excerpt && (
                  <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                    {result.excerpt}
                  </p>
                )}
                {result.price !== undefined && (
                  <p className="text-sm font-bold text-red-600 mt-1">
                    {formatPrice(result.price)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-16">
          <p className="text-lg mb-2">Khong tim thay ket qua</p>
          <p className="text-sm">Thu tim voi tu khoa khac</p>
        </div>
      )}
    </div>
  );
}
