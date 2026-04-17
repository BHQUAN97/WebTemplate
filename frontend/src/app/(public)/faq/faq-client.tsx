'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Search, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { faqApi } from '@/lib/api/modules/faq.api';
import { useDebounce } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import type { FAQ } from '@/lib/types';

/**
 * Trang FAQ — tim kiem, accordion theo nhom, helpful buttons
 */
export function FaqClient() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [helpfulFeedback, setHelpfulFeedback] = useState<Record<string, boolean | null>>({});

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await faqApi.getFaqs({ search: debouncedSearch || undefined });
        setFaqs(res ?? []);
      } catch {
        setFaqs([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [debouncedSearch]);

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFeedback = async (id: string, helpful: boolean) => {
    setHelpfulFeedback((prev) => ({ ...prev, [id]: helpful }));
    try {
      await faqApi.markHelpful(id, helpful);
    } catch {
      // Ignore
    }
  };

  // Nhom FAQ theo category
  const grouped = faqs.reduce<Record<string, FAQ[]>>((acc, faq) => {
    const cat = faq.category || 'Chung';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">
        Cau hoi thuong gap
      </h1>
      <p className="text-gray-500 mb-6">
        Tim cau tra loi cho nhung cau hoi pho bien
      </p>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tim kiem cau hoi..."
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : Object.keys(grouped).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                {category}
              </h2>
              <div className="space-y-2">
                {items.map((faq) => {
                  const isOpen = openIds.has(faq.id);
                  const feedback = helpfulFeedback[faq.id] ?? null;

                  return (
                    <div
                      key={faq.id}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleOpen(faq.id)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-sm sm:text-base pr-4">
                          {faq.question}
                        </span>
                        <ChevronDown
                          className={cn(
                            'h-5 w-5 text-gray-400 flex-shrink-0 transition-transform',
                            isOpen && 'rotate-180',
                          )}
                        />
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                          <div
                            className="prose prose-sm max-w-none text-gray-600 pt-3"
                            dangerouslySetInnerHTML={{ __html: faq.answer }}
                          />

                          {/* Helpful buttons */}
                          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-400">
                              Cau tra loi nay co huu ich khong?
                            </span>
                            <button
                              onClick={() => handleFeedback(faq.id, true)}
                              className={cn(
                                'p-1.5 rounded hover:bg-green-50 transition-colors',
                                feedback === true && 'bg-green-50 text-green-600',
                              )}
                              aria-label="Huu ich"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleFeedback(faq.id, false)}
                              className={cn(
                                'p-1.5 rounded hover:bg-red-50 transition-colors',
                                feedback === false && 'bg-red-50 text-red-600',
                              )}
                              aria-label="Khong huu ich"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-12">
          Khong tim thay cau hoi nao
        </p>
      )}

      {/* Contact CTA */}
      <div className="mt-12 text-center bg-gray-50 rounded-xl p-6 sm:p-8">
        <h3 className="text-lg font-bold mb-2">Khong tim thay cau tra loi?</h3>
        <p className="text-gray-500 text-sm mb-4">
          Lien he truc tiep voi chung toi de duoc ho tro
        </p>
        <Button asChild>
          <Link href="/contact">Lien he ngay</Link>
        </Button>
      </div>
    </div>
  );
}
