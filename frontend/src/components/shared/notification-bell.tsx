'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';

/**
 * Notification bell — popover dropdown hien 10 thong bao moi nhat,
 * badge hien so unread. Click -> mark read va navigate.
 */
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  const latest = React.useMemo(
    () => notifications.slice(0, 10),
    [notifications],
  );

  const handleClick = async (n: Notification) => {
    if (!n.is_read) await markAsRead(n.id);
    const link =
      (n.data as { link?: string } | null)?.link ??
      (typeof (n as unknown as { link?: string }).link === 'string'
        ? (n as unknown as { link?: string }).link
        : undefined);
    setOpen(false);
    if (link) router.push(link);
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Thong bao">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h4 className="font-semibold text-sm">Thong bao</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleMarkAll}
              disabled={markingAll}
            >
              {markingAll ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              Danh dau da doc
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {latest.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Chua co thong bao
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {latest.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-start gap-2',
                      !n.is_read && 'bg-blue-50/50',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-2 w-2 rounded-full flex-shrink-0',
                        n.is_read ? 'bg-gray-300' : 'bg-blue-500',
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm truncate',
                          n.is_read ? 'font-normal text-gray-700' : 'font-medium',
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {n.content}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatDate(n.created_at)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-2 border-t border-gray-200">
          <Link
            href="/admin/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-sm text-blue-600 hover:underline py-1"
          >
            Xem tat ca
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
