import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface FormSkeletonProps {
  /** So field render — moi field gom label + input */
  fields: number;
  /** An nut submit o cuoi */
  hideActions?: boolean;
  className?: string;
}

/**
 * Skeleton cho form — N field (label + input) + actions row.
 * Dung trong dialog, edit page, create page...
 */
export function FormSkeleton({
  fields,
  hideActions = false,
  className,
}: FormSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}

      {!hideActions && (
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-24" />
        </div>
      )}
    </div>
  );
}
