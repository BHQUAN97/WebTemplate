import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ListItemSkeletonProps {
  className?: string;
  /** Ne lai avatar khi list khong can anh */
  showAvatar?: boolean;
  /** Ne lai metadata ben phai */
  showTrailing?: boolean;
}

/**
 * Skeleton cho list item — avatar tron + 2 dong text + metadata phai.
 * Dung cho notifications list, messages, activity feed...
 */
export function ListItemSkeleton({
  className,
  showAvatar = true,
  showTrailing = true,
}: ListItemSkeletonProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border bg-card p-3',
        className,
      )}
    >
      {showAvatar && (
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      )}

      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3.5 w-11/12" />
      </div>

      {showTrailing && (
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-2 w-2 rounded-full" />
        </div>
      )}
    </div>
  );
}
