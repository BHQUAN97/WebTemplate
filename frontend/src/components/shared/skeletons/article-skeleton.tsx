import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ArticleSkeletonProps {
  className?: string;
}

/**
 * Skeleton cho blog article — hero image, title, metadata (author/date/tag),
 * va nhieu paragraph text voi chieu rong bien thien.
 */
export function ArticleSkeleton({ className }: ArticleSkeletonProps) {
  return (
    <article
      className={cn(
        'mx-auto w-full max-w-3xl space-y-6',
        className,
      )}
    >
      {/* Hero image */}
      <Skeleton className="aspect-[16/9] w-full rounded-lg" />

      {/* Title — 2 dong */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-11/12" />
        <Skeleton className="h-8 w-4/5" />
      </div>

      {/* Metadata — author + date + tag */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="ml-auto h-6 w-16 rounded-full" />
      </div>

      {/* Body paragraphs */}
      <div className="space-y-4 pt-2">
        {Array.from({ length: 3 }).map((_, p) => (
          <div key={p} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </article>
  );
}
