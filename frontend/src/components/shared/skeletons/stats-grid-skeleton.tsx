import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatsGridSkeletonProps {
  /** So stat card — mac dinh 4 */
  count?: number;
  className?: string;
}

/**
 * Skeleton cho grid thong ke — 4 cot tren desktop, responsive ve 2/1 cot.
 * Moi stat card gom: icon vuong + label + gia tri lon + delta.
 */
export function StatsGridSkeleton({
  count = 4,
  className,
}: StatsGridSkeletonProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
