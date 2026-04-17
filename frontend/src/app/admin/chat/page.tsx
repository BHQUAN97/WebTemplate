'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare, Search, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/empty-state';
import { ListItemSkeleton } from '@/components/shared/skeletons';
import { ConversationListItem } from '@/components/admin/chat/conversation-list-item';
import { ConversationDetail } from '@/components/admin/chat/conversation-detail';
import { useSocket } from '@/lib/hooks/use-socket';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from '@/lib/hooks/use-toast';
import { adminChatApi, type AdminConversation, type ConversationStatus } from '@/lib/api/modules/admin-chat.api';
import type { ChatMessage } from '@/lib/types/chat';
import { cn } from '@/lib/utils';

/** Cac tab filter theo status */
const STATUS_TABS: Array<{ value: 'all' | ConversationStatus; label: string }> = [
  { value: 'all', label: 'Tat ca' },
  { value: 'WAITING_AGENT', label: 'Cho nhan vien' },
  { value: 'IN_PROGRESS', label: 'Dang xu ly' },
  { value: 'AI_RESPONDING', label: 'AI tra loi' },
  { value: 'CLOSED', label: 'Da dong' },
];

/**
 * Admin chat console — 2-pane layout (list + detail).
 * Mobile: hien 1 trong 2 pane, dieu huong qua query ?id=.
 */
export default function AdminChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id') ?? null;

  const currentUser = useAuthStore((s) => s.user);

  const [tab, setTab] = React.useState<'all' | ConversationStatus>('all');
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [conversations, setConversations] = React.useState<AdminConversation[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<AdminConversation | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  const { emit, on } = useSocket(currentUser?.id);

  // --- Load list ---
  const loadList = React.useCallback(async () => {
    setListLoading(true);
    try {
      const res = await adminChatApi.listConversations({
        status: tab,
        search: debouncedSearch || undefined,
        page: 1,
        limit: 50,
      });
      // Response co the la ApiResponse<[]> hoac array truc tiep — ho tro ca hai
      const data = Array.isArray(res) ? res : (res?.data ?? []);
      setConversations(data);
    } catch (err) {
      toast('Khong tai duoc danh sach', (err as Error).message, 'destructive');
    } finally {
      setListLoading(false);
    }
  }, [tab, debouncedSearch]);

  React.useEffect(() => {
    loadList();
  }, [loadList]);

  // --- Load detail when selectedId changes ---
  React.useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    Promise.all([
      adminChatApi.getConversation(selectedId),
      adminChatApi.getMessages(selectedId, { limit: 100 }),
    ])
      .then(([conv, msgs]) => {
        if (cancelled) return;
        setSelected(conv);
        setMessages(Array.isArray(msgs) ? msgs : []);
        // Subscribe qua socket + mark read
        emit('conversation:subscribe', { conversationId: selectedId });
        adminChatApi.markRead(selectedId).catch(() => {});
      })
      .catch((err) => {
        if (!cancelled) toast('Khong tai duoc cuoc chat', (err as Error).message, 'destructive');
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, emit]);

  // --- Socket listeners ---
  React.useEffect(() => {
    const offNewMsg = on('message:new', (payload: { conversationId: string; message: ChatMessage }) => {
      if (!payload?.message) return;
      if (payload.conversationId === selectedId) {
        setMessages((prev) => [...prev, payload.message]);
      }
      // Update preview trong list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === payload.conversationId
            ? {
                ...c,
                lastMessage: payload.message.content,
                lastMessageAt: payload.message.createdAt,
                unreadCount: payload.conversationId === selectedId ? 0 : (c.unreadCount ?? 0) + 1,
              }
            : c,
        ),
      );
    });

    const offNewConv = on('conversation:new', (payload: { conversation: AdminConversation }) => {
      if (!payload?.conversation) return;
      // Them vao dau danh sach neu match tab hien tai
      if (tab === 'all' || payload.conversation.status === tab) {
        setConversations((prev) => [payload.conversation, ...prev.filter((c) => c.id !== payload.conversation.id)]);
      }
      if (payload.conversation.status === 'WAITING_AGENT') {
        toast('Co khach cho', `Khach #${payload.conversation.id.slice(-6).toUpperCase()} dang doi`, 'warning');
      }
    });

    const offUpdate = on('conversation:update', (payload: { conversation: AdminConversation }) => {
      if (!payload?.conversation) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === payload.conversation.id ? { ...c, ...payload.conversation } : c)),
      );
      if (payload.conversation.id === selectedId) {
        setSelected((s) => (s ? { ...s, ...payload.conversation } : s));
      }
    });

    emit('agent:list-active');

    return () => {
      offNewMsg?.();
      offNewConv?.();
      offUpdate?.();
    };
  }, [on, emit, selectedId, tab]);

  // --- Handlers ---

  const openConversation = (id: string) => {
    router.push(`/admin/chat?id=${id}`);
  };

  const backToList = () => {
    router.push('/admin/chat');
  };

  const handleSend = async (content: string) => {
    if (!selectedId) return;
    setSending(true);
    try {
      const msg = await adminChatApi.sendMessage(selectedId, { content, type: 'text' });
      setMessages((prev) => [...prev, msg]);
    } catch (err) {
      toast('Gui that bai', (err as Error).message, 'destructive');
    } finally {
      setSending(false);
    }
  };

  const handleAssignSelf = async () => {
    if (!selectedId || !currentUser?.id) return;
    try {
      const updated = await adminChatApi.assignConversation(selectedId, currentUser.id);
      setSelected(updated);
      toast('Da nhan cuoc chat', undefined, 'success');
    } catch (err) {
      toast('Khong the nhan', (err as Error).message, 'destructive');
    }
  };

  const handleClose = async () => {
    if (!selectedId) return;
    try {
      const updated = await adminChatApi.closeConversation(selectedId);
      setSelected(updated);
      toast('Da dong cuoc chat', undefined, 'success');
      loadList();
    } catch (err) {
      toast('Khong the dong', (err as Error).message, 'destructive');
    }
  };

  // --- Render ---

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tro chuyen voi khach"
        description="Quan ly va tra loi cac cuoc tro chuyen tu khach hang"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Cham soc khach hang' },
          { label: 'Hop thoai' },
        ]}
      />

      <div
        className={cn(
          'grid overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
          'h-[calc(100vh-220px)] min-h-[520px]',
          'grid-cols-1 md:grid-cols-[320px_1fr]',
        )}
      >
        {/* Sidebar list */}
        <aside
          className={cn(
            'flex min-h-0 flex-col border-r border-gray-200 dark:border-gray-800',
            selectedId && 'hidden md:flex',
          )}
        >
          <div className="space-y-2 border-b border-gray-200 p-3 dark:border-gray-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tim khach / tin nhan..."
                className="pl-8"
              />
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="w-full overflow-x-auto">
                {STATUS_TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value} className="shrink-0 text-xs">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {listLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ListItemSkeleton key={i} />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="h-10 w-10" />}
                title="Chua co cuoc chat"
                description="Cac hoi thoai moi se xuat hien o day"
              />
            ) : (
              <div className="space-y-1">
                {conversations.map((c) => (
                  <ConversationListItem
                    key={c.id}
                    conversation={c}
                    active={c.id === selectedId}
                    onClick={() => openConversation(c.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Detail */}
        <div className={cn('flex min-h-0 flex-col', !selectedId && 'hidden md:flex')}>
          {detailLoading && !selected ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <ConversationDetail
              conversation={selected}
              messages={messages}
              loading={detailLoading}
              sending={sending}
              onBack={backToList}
              onSend={handleSend}
              onAssignSelf={handleAssignSelf}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
