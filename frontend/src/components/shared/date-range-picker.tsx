'use client';

import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/format';

interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  className?: string;
}

/**
 * Date range picker don gian dung Popover + 2 input date
 * Se nang cap thanh Calendar component day du sau
 */
export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [from, setFrom] = React.useState(value?.from || '');
  const [to, setTo] = React.useState(value?.to || '');

  const handleApply = () => {
    if (from && to) {
      onChange?.({ from, to });
    }
  };

  const displayText = from && to
    ? `${formatDate(from)} - ${formatDate(to)}`
    : 'Chon khoang thoi gian';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('justify-start text-left font-normal', className)}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Tu ngay</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Den ngay</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button size="sm" className="w-full" onClick={handleApply}>
            Ap dung
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
