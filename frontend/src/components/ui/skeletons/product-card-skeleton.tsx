import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton cho product card — image vuong, title, price
 */
export function ProductCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-3">
      <Skeleton className="aspect-square w-full rounded-md" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-5 w-1/3" />
    </div>
  );
}
