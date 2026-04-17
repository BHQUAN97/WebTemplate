'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronLeft,
  Share2,
  Share,
  Link2,
  Clock,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { articlesApi } from '@/lib/api/modules/articles.api';
import { formatDate, getReadingTime } from '@/lib/hooks';
import type { Article } from '@/lib/types';

interface Props {
  slug: string;
}

/**
 * Chi tiet bai viet — header, content, share, author bio, related
 */
export function BlogPostClient({ slug }: Props) {
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await articlesApi.getArticleBySlug(slug);
        setArticle(res);

        // Load related
        const relRes = await articlesApi.getPublished({ limit: 3 });
        setRelated(
          (relRes ?? []).filter((a) => a.slug !== slug).slice(0, 3),
        );
      } catch {
        setArticle(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-5 w-1/3 mb-6" />
        <Skeleton className="aspect-[2/1] rounded-xl mb-6" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Bai viet khong ton tai</h1>
        <Button asChild>
          <Link href="/blog">Quay lai Blog</Link>
        </Button>
      </div>
    );
  }

  const readingTime = getReadingTime(article.content);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Back */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-6"
      >
        <ChevronLeft className="h-4 w-4" /> Blog
      </Link>

      {/* Header */}
      <article>
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-6">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {article.published_at ? formatDate(article.published_at) : ''}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {readingTime} phut doc
            </div>
            {article.author && <span>boi {article.author.name}</span>}
          </div>

          {article.featured_image && (
            <div className="relative aspect-[2/1] rounded-xl overflow-hidden bg-gray-100">
              <Image
                src={article.featured_image}
                alt={article.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
            </div>
          )}
        </header>

        {/* Content */}
        <div
          className="prose prose-sm sm:prose max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Share buttons */}
        <div className="flex items-center gap-3 border-t border-gray-200 pt-6 mb-8">
          <span className="text-sm font-medium text-gray-700">Chia se:</span>
          <Button variant="outline" size="icon" asChild>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chia se Facebook"
            >
              <Share2 className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chia se Twitter"
            >
              <Share className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" size="icon" onClick={handleCopyLink} aria-label="Copy link">
            <Link2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Author bio */}
        {article.author && (
          <Card className="mb-8">
            <CardContent className="p-4 sm:p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                {article.author.avatar_url ? (
                  <Image
                    src={article.author.avatar_url}
                    alt={article.author.name}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                ) : (
                  <span className="text-blue-600 font-bold">
                    {article.author.name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold">{article.author.name}</p>
                <p className="text-sm text-gray-500">Tac gia</p>
              </div>
            </CardContent>
          </Card>
        )}
      </article>

      {/* Related articles */}
      {related.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-6">Bai viet lien quan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((a) => (
              <Link key={a.id} href={`/blog/${a.slug}`} className="group block">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mb-2">
                  {a.featured_image ? (
                    <Image
                      src={a.featured_image}
                      alt={a.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="33vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                      Image
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-medium line-clamp-2 group-hover:text-blue-600">
                  {a.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
