import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProductCardSkeletonProps {
  className?: string;
}

/**
 * Skeleton cho ProductCard — giu nguyen layout: image 16:9, title 2 dong, price.
 * Tuong thich dark mode qua token bg-card / border-border tu Tailwind theme.
 */
export function ProductCardSkeleton({ className }: ProductCardSkeletonProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-3',
        className,
      )}
    >
      {/* Anh san pham — ty le 16:9 */}
      <Skeleton className="aspect-[16/9] w-full rounded-md" />

      {/* Title — 2 dong */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Price + badge */}
      <div className="mt-auto flex items-center justify-between pt-1">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}
