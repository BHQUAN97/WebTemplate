import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CardSkeletonProps {
  className?: string;
  /** An footer khi card khong co actions */
  hideFooter?: boolean;
  /** So dong body render */
  bodyLines?: number;
}

/**
 * Skeleton cho generic card — header (title + subtitle) + body + footer actions.
 */
export function CardSkeleton({
  className,
  hideFooter = false,
  bodyLines = 3,
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card text-card-foreground shadow-sm',
        className,
      )}
    >
      {/* Header */}
      <div className="border-b border-border p-4">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="mt-2 h-3.5 w-3/5" />
      </div>

      {/* Body */}
      <div className="space-y-2 p-4">
        {Array.from({ length: bodyLines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('h-3.5', i === bodyLines - 1 ? 'w-2/3' : 'w-full')}
          />
        ))}
      </div>

      {/* Footer */}
      {!hideFooter && (
        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      )}
    </div>
  );
}
