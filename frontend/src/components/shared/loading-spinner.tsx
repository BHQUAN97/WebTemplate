import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

/**
 * Loading spinner canh giua voi text tuy chon
 */
export function LoadingSpinner({
  text,
  size = 'md',
  className,
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-8', className)}>
      <Loader2 className={cn('animate-spin text-blue-600', sizeMap[size])} />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
}
