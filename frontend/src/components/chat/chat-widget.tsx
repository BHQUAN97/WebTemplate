'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MessageCircle, X, Bot } from 'lucide-react';
import { useChatStore } from '@/lib/stores/chat-store';
import { useChatSocket } from '@/lib/hooks/use-chat-socket';
import { chatApi } from '@/lib/api/modules/chat.api';
import { cn } from '@/lib/utils';
import { ChatMessageList } from './chat-message-list';
import { ChatInput } from './chat-input';
import { ChatWelcomeForm } from './chat-welcome-form';
import { ChatStatusBar } from './chat-status-bar';
import type { ChatQuickReply } from '@/lib/types/chat';

/**
 * Chat widget chinh — float bottom-right, persistent session.
 * Co 2 state lon:
 *  - Chua co conversation: hien welcome form
 *  - Da co conversation: hien status bar + message list + input
 * Socket tu ket noi khi co conversationId; neu down → sendMessage fallback REST.
 */
export function ChatWidget() {
  const conversationId = useChatStore((s) => s.conversationId);
  const messages = useChatStore((s) => s.messages);
  const isOpen = useChatStore((s) => s.isOpen);
  const isConnected = useChatStore((s) => s.isConnected);
  const isTyping = useChatStore((s) => s.isTyping);
  const agent = useChatStore((s) => s.agent);
  const mode = useChatStore((s) => s.mode);
  const unreadCount = useChatStore((s) => s.unreadCount);
  const hasMoreMessages = useChatStore((s) => s.hasMoreMessages);
  const isLoading = useChatStore((s) => s.isLoading);
  const isStarting = useChatStore((s) => s.isStarting);
  const hasRestored = useChatStore((s) => s.hasRestored);
  const error = useChatStore((s) => s.error);

  const toggleOpen = useChatStore((s) => s.toggleOpen);
  const closeWidget = useChatStore((s) => s.closeWidget);
  const openWidget = useChatStore((s) => s.openWidget);
  const startConversation = useChatStore((s) => s.startConversation);
  const restoreSession = useChatStore((s) => s.restoreSession);
  const loadMoreMessages = useChatStore((s) => s.loadMoreMessages);
  const sendMessageStore = useChatStore((s) => s.sendMessage);
  const addMessage = useChatStore((s) => s.addMessage);

  const { sendTyping, sendMessage: sendViaSocket } = useChatSocket();

  // Restore session khi mount lan dau
  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  // Esc de dong widget khi dang mo
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeWidget();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeWidget]);

  // Focus trap & focus vao panel khi mo
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isOpen && panelRef.current) {
      // Focus vao panel de screen reader announce
      panelRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async (content: string) => {
    if (!conversationId) return;
    // Thu WS truoc, fallback REST neu down
    const viaSocket = sendViaSocket(content, 'text');
    if (!viaSocket) {
      try {
        await sendMessageStore(content);
      } catch {
        // Loi da duoc store capture → UI se hien message error
      }
    } else {
      // Optimistic append tin user (uuid tam) — BE se broadcast lai event chat:message
      // nhung trong thoi gian cho, hien luon de UX muot.
      const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      addMessage({
        id: tempId,
        conversationId,
        role: 'user',
        type: 'text',
        content,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleQuickReply = async (qr: ChatQuickReply) => {
    if (!conversationId) return;
    // Quick reply guoi nhu tin user, payload dung lam content
    await handleSend(qr.payload);
  };

  // Header title/subtitle dung theo mode
  const headerInfo = useMemo(() => {
    if (mode === 'human' && agent?.name) {
      return { title: agent.name, subtitle: 'Nhan vien ho tro' };
    }
    if (mode === 'offline') {
      return { title: 'Ho tro khach hang', subtitle: 'Dang ngoai gio truc' };
    }
    return { title: 'Ho tro khach hang', subtitle: 'Tro ly AI san sang 24/7' };
  }, [mode, agent]);

  const hasSession = Boolean(conversationId);

  return (
    <>
      {/* Floating launcher — an khi panel dang mo de tranh che */}
      {!isOpen && (
        <button
          type="button"
          onClick={openWidget}
          aria-label="Mo hop chat ho tro"
          className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-700 active:scale-95 print:hidden"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
          }}
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Hop chat ho tro"
          tabIndex={-1}
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl outline-none dark:bg-gray-950 print:hidden',
            // Mobile: fullscreen
            'inset-0 rounded-none',
            // Desktop: float goc phai duoi 380x560
            'sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[560px] sm:w-[380px] sm:rounded-2xl sm:border sm:border-gray-200 sm:dark:border-gray-800',
          )}
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-blue-600 px-3 py-2.5 text-white dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                {mode === 'human' && agent?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={agent.avatarUrl}
                    alt={agent.name ?? ''}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <Bot className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{headerInfo.title}</p>
                <p className="truncate text-[11px] text-white/80">
                  {headerInfo.subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeWidget}
              aria-label="Dong hop chat"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          {!hasSession ? (
            // Chua co session → welcome form
            !hasRestored ? (
              <div className="flex flex-1 items-center justify-center bg-white dark:bg-gray-950">
                <span className="text-sm text-gray-400">Dang tai...</span>
              </div>
            ) : (
              <ChatWelcomeForm
                isSubmitting={isStarting}
                error={error}
                onStart={(profile) => startConversation(profile)}
                onSkip={() =>
                  startConversation({
                    initialMessage: 'Xin chao, toi can ho tro.',
                  })
                }
              />
            )
          ) : (
            <>
              <ChatStatusBar
                mode={mode}
                agent={agent}
                isConnected={isConnected}
              />

              <ChatMessageList
                messages={messages}
                isTypingAgent={isTyping.agent}
                isTypingAi={isTyping.ai}
                hasMore={hasMoreMessages}
                isLoadingMore={isLoading}
                onLoadMore={() => void loadMoreMessages()}
                onQuickReply={(qr) => void handleQuickReply(qr)}
              />

              {!isConnected && (
                <div className="border-t border-amber-200 bg-amber-50 px-3 py-1.5 text-center text-[11px] text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
                  Mat ket noi — tin nhan van gui qua HTTP.
                </div>
              )}

              <ChatInput
                placeholder="Nhap tin nhan..."
                onSend={handleSend}
                onTypingChange={sendTyping}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}

// Re-export de tranh circular imports o provider
export { chatApi };
