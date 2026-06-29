'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Clock, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { searchApi, type SearchResult } from '@/lib/api/modules/search.api';
import { useDebounce, formatPrice } from '@/lib/hooks';

const MAX_RECENT = 5;
const STORAGE_KEY = 'recent_searches';

function getRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecent(q: string) {
  const list = [q, ...getRecent().filter((r) => r !== q)].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Bọc phần khớp query trong <mark> để highlight */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-inherit rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/**
 * Trang Tìm kiếm — tabs All/Products/Articles, result cards,
 * search highlight, recent searches.
 */
export function SearchClient() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'product' | 'article'>('all');
  const [recent, setRecent] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    setRecent(getRecent());
  }, []);

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
        // Lưu lịch sử tìm kiếm sau khi có kết quả
        saveRecent(debouncedQuery.trim());
        setRecent(getRecent());
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    search();
  }, [debouncedQuery, activeTab]);

  const clearRecent = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRecent([]);
  }, []);

  const filteredResults =
    activeTab === 'all'
      ? results
      : results.filter((r) => r.type === activeTab);

  const tabs = [
    { key: 'all' as const, label: 'Tất cả' },
    { key: 'product' as const, label: 'Sản phẩm' },
    { key: 'article' as const, label: 'Bài viết' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Tìm kiếm</h1>

      {/* Search input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhập từ khoá tìm kiếm..."
          className="pl-10 h-12 text-base"
          autoFocus
        />
        {query && (
          <button
            type="button"
            aria-label="Xóa"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Recent searches — hiển thị khi input rỗng */}
      {!query.trim() && recent.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Tìm kiếm gần đây
            </span>
            <button
              type="button"
              onClick={clearRecent}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Xóa tất cả
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setQuery(r)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

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
          <p>Nhập từ khoá để bắt đầu tìm kiếm</p>
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
          <p className="text-sm text-gray-500">
            {filteredResults.length} kết quả cho &ldquo;{debouncedQuery}&rdquo;
          </p>
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
                    {result.type === 'product' ? 'Sản phẩm' : 'Bài viết'}
                  </Badge>
                  {result.category && (
                    <span className="text-xs text-gray-400">{result.category}</span>
                  )}
                </div>
                <h3 className="font-medium text-sm sm:text-base line-clamp-1">
                  <HighlightText text={result.title} query={debouncedQuery} />
                </h3>
                {result.excerpt && (
                  <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                    <HighlightText text={result.excerpt} query={debouncedQuery} />
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
          <p className="text-lg mb-2">Không tìm thấy kết quả</p>
          <p className="text-sm">Thử tìm với từ khoá khác</p>
        </div>
      )}
    </div>
  );
}
