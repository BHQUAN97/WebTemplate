import * as React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number; // % thay doi, vd: +12.5 hoac -3.2
  trendLabel?: string;
  className?: string;
}

/**
 * Card thong ke dashboard — icon, gia tri, xu huong tang/giam
 */
export function StatCard({
  icon,
  label,
  value,
  trend,
  trendLabel,
  className,
}: StatCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="text-gray-400">{icon}</div>
          {trend !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                isPositive ? 'text-green-600' : 'text-red-600',
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isPositive ? '+' : ''}
              {trend.toFixed(1)}%
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{label}</p>
          {trendLabel && (
            <p className="text-xs text-gray-400 mt-0.5">{trendLabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
