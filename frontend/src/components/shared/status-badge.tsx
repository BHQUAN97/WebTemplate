import { Badge } from '@/components/ui/badge';
import { statusColor } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

/**
 * Badge tu dong doi mau theo trang thai
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusColor(status), className)}>
      {label || status}
    </span>
  );
}
