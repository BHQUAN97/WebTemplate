'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Trash2,
  ShoppingBag,
  Megaphone,
  Settings as SettingsIcon,
  Inbox,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/empty-state';
import { ListItemSkeleton } from '@/components/shared/skeletons';
import { apiClient, ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';

type Filter = 'all' | 'unread' | 'read';

interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const PAGE_SIZE = 20;

/**
 * Chon icon va mau theo type — mapping business don gian.
 */
function getTypeVisuals(type: string) {
  const t = (type || '').toLowerCase();
  if (t.includes('order')) {
    return {
      Icon: ShoppingBag,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-500/15',
    };
  }
  if (t.includes('promo') || t.includes('marketing')) {
    return {
      Icon: Megaphone,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-500/15',
    };
  }
  if (t.includes('system') || t.includes('security')) {
    return {
      Icon: SettingsIcon,
      color: 'text-slate-600 dark:text-slate-300',
      bg: 'bg-slate-100 dark:bg-slate-500/15',
    };
  }
  return {
    Icon: Bell,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-100 dark:bg-indigo-500/15',
  };
}

/**
 * Trich link tu notification.data (field `link` la convention chung).
 */
function extractLink(n: Notification): string | null {
  const data = n.data as { link?: string; url?: string } | null;
  return data?.link ?? data?.url ?? null;
}

/**
 * Format timestamp kieu "5 phut truoc" — dung date-fns voi locale vi.
 * Fallback sang Intl.RelativeTimeFormat neu date invalid.
 */
function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return formatDistanceToNow(d, { addSuffix: true, locale: vi });
  } catch {
    return '';
  }
}

/**
 * Trang Notification Center — list + filter + bulk actions.
 * Fetch qua REST; khong dung TanStack Query (chua cai trong project).
 */
export default function NotificationsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [items, setItems] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<'markAll' | 'deleteRead' | null>(null);
  const [filter, setFilter] = React.useState<Filter>('all');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<PaginatedResponse<Notification> | Notification[]>(
        '/notifications',
        { page: 1, limit: PAGE_SIZE },
      );
      // Ho tro ca 2 shape — array hoac {data, meta}
      const list = Array.isArray(res)
        ? res
        : ((res as PaginatedResponse<Notification>).data ?? []);
      setItems(list);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Khong tai duoc thong bao';
      toast('Loi', msg, 'destructive');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  const unreadCount = React.useMemo(
    () => items.filter((n) => !n.is_read).length,
    [items],
  );
  const readCount = items.length - unreadCount;

  const filtered = React.useMemo(() => {
    if (filter === 'unread') return items.filter((n) => !n.is_read);
    if (filter === 'read') return items.filter((n) => n.is_read);
    return items;
  }, [items, filter]);

  // --- Actions ---

  const markOneRead = async (id: string) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (err) {
      // Rollback
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n)),
      );
      const msg =
        err instanceof ApiError ? err.message : 'Khong the danh dau da doc';
      toast('Loi', msg, 'destructive');
    }
  };

  const handleItemClick = async (n: Notification) => {
    const link = extractLink(n);
    if (!n.is_read) {
      // Fire-and-forget — khong chan navigation
      void markOneRead(n.id);
    }
    if (link) router.push(link);
  };

  const markAllRead = async () => {
    if (unreadCount === 0 || busy) return;
    setBusy('markAll');
    const snapshot = items;
    // Optimistic
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await apiClient.patch('/notifications/read-all');
      toast('Da danh dau tat ca da doc', undefined, 'success');
    } catch (err) {
      setItems(snapshot);
      const msg =
        err instanceof ApiError ? err.message : 'That bai, thu lai';
      toast('Loi', msg, 'destructive');
    } finally {
      setBusy(null);
    }
  };

  const deleteRead = async () => {
    if (readCount === 0 || busy) return;
    setBusy('deleteRead');
    const snapshot = items;
    // Optimistic remove
    setItems((prev) => prev.filter((n) => !n.is_read));
    try {
      // BE co endpoint bulk: DELETE /notifications/read
      const res = await apiClient.delete<
        { data?: { deletedCount: number }; deletedCount?: number } | null
      >('/notifications/read');
      // Ho tro ca 2 shape — wrapped ({data}) hoac flat
      const deleted =
        (res && 'data' in res && res.data?.deletedCount) ??
        (res && 'deletedCount' in res ? res.deletedCount : undefined) ??
        snapshot.filter((n) => n.is_read).length;
      toast('Da xoa thong bao da doc', `${deleted} muc`, 'success');
    } catch (err) {
      // Rollback va reload de dong bo
      setItems(snapshot);
      const msg = err instanceof ApiError ? err.message : 'Khong the xoa';
      toast('Loi', msg, 'destructive');
      await load();
    } finally {
      setBusy(null);
    }
  };

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">Thong bao</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-6 rounded-full px-2 text-xs">
                {unreadCount} chua doc
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Tat ca thong bao cua ban o day. Click de xem chi tiet.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={unreadCount === 0 || busy !== null}
          >
            {busy === 'markAll' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-2 h-4 w-4" />
            )}
            Danh dau tat ca da doc
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={deleteRead}
            disabled={readCount === 0 || busy !== null}
          >
            {busy === 'deleteRead' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Xoa da doc
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">
            Tat ca
            <span className="ml-1.5 text-xs text-muted-foreground">
              {items.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="unread">
            Chua doc
            <span className="ml-1.5 text-xs text-muted-foreground">
              {unreadCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="read">
            Da doc
            <span className="ml-1.5 text-xs text-muted-foreground">
              {readCount}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-12 w-12" />}
          title={
            filter === 'unread'
              ? 'Khong co thong bao chua doc'
              : filter === 'read'
                ? 'Chua co thong bao da doc'
                : 'Chua co thong bao nao'
          }
          description="Khi co thong bao moi, ho se xuat hien tai day."
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => {
            const { Icon, color, bg } = getTypeVisuals(n.type);
            const link = extractLink(n);
            const Wrapper: React.ElementType = link ? Link : 'button';
            const wrapperProps: Record<string, unknown> = link
              ? { href: link, onClick: () => !n.is_read && void markOneRead(n.id) }
              : { type: 'button', onClick: () => handleItemClick(n) };

            return (
              <li key={n.id}>
                <Wrapper
                  {...wrapperProps}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    n.is_read
                      ? 'border-border bg-card'
                      : 'border-primary/30 bg-primary/5 dark:bg-primary/10',
                  )}
                >
                  {/* Icon theo type */}
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      bg,
                    )}
                  >
                    <Icon className={cn('h-5 w-5', color)} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'truncate text-sm',
                          n.is_read
                            ? 'font-normal text-foreground/80'
                            : 'font-semibold text-foreground',
                        )}
                      >
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span
                          aria-label="Chua doc"
                          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {n.content}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      {formatRelative(n.created_at)}
                    </p>
                  </div>
                </Wrapper>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
