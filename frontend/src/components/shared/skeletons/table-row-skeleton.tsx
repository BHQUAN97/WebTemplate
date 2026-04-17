import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface TableRowSkeletonProps {
  /** So cot — match voi header cua bang dang render */
  columns: number;
  /** Tuy chon: custom className cho row wrapper */
  className?: string;
}

/**
 * Skeleton cho 1 row cua data table — render N cell tuong ung cot.
 * Dung ben trong <tbody> voi <tr>/<td> theo layout cua bang.
 */
export function TableRowSkeleton({ columns, className }: TableRowSkeletonProps) {
  return (
    <tr className={cn('border-b border-border', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <Skeleton
            className={cn(
              'h-4',
              // Bien tau chieu rong de trong tu nhien hon
              i === 0 ? 'w-2/3' : i === columns - 1 ? 'w-1/3' : 'w-4/5',
            )}
          />
        </td>
      ))}
    </tr>
  );
}
