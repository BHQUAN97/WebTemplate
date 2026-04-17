'use client';

import { cn } from '@/lib/utils';

/**
 * 3 cham nay len xuong — hien thi khi agent/AI dang soan tin.
 */
export function ChatTypingIndicator({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2 dark:bg-gray-800',
        className,
      )}
      aria-label="Dang soan tin"
      role="status"
    >
      <span className="sr-only">Dang soan tin</span>
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s] dark:bg-gray-500" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s] dark:bg-gray-500" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500" />
    </div>
  );
}
