'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ChatMessageItem } from './chat-message-item';
import { ChatTypingIndicator } from './chat-typing-indicator';
import type { ChatMessage, ChatQuickReply } from '@/lib/types/chat';

interface Props {
  messages: ChatMessage[];
  isTypingAgent: boolean;
  isTypingAi: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onQuickReply?: (reply: ChatQuickReply) => void;
}

// Nguong chuyen sang render "windowed" bang manual memoization.
// Duoi nguong: render het; tren nguong: chi render N tin cuoi.
const VIRTUALIZE_THRESHOLD = 100;
const WINDOW_SIZE = 60;

/**
 * Render list message — auto-scroll khi co tin moi, load-more khi scroll len dau.
 * Group theo sender: chi hien avatar/ten o tin dau tien cua nhom consecutive.
 */
export function ChatMessageList({
  messages,
  isTypingAgent,
  isTypingAi,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onQuickReply,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prevLengthRef = useRef(messages.length);
  const prevFirstIdRef = useRef(messages[0]?.id);

  // Virtualization: cat bot tin cu khi tong qua nguong
  const rendered = useMemo(() => {
    if (messages.length <= VIRTUALIZE_THRESHOLD) return messages;
    return messages.slice(messages.length - WINDOW_SIZE);
  }, [messages]);

  // Tinh cac tin dau tien cua "nhom" sender de hien ten 1 lan
  const showSenderFlags = useMemo(() => {
    const flags: boolean[] = [];
    for (let i = 0; i < rendered.length; i++) {
      const curr = rendered[i];
      const prev = rendered[i - 1];
      const changed =
        !prev ||
        prev.role !== curr.role ||
        (prev.sender?.id ?? null) !== (curr.sender?.id ?? null);
      flags.push(changed);
    }
    return flags;
  }, [rendered]);

  // Auto-scroll xuong cuoi khi co tin moi (so sanh length)
  useEffect(() => {
    const prevLength = prevLengthRef.current;
    const prevFirstId = prevFirstIdRef.current;
    const currFirstId = messages[0]?.id;
    prevLengthRef.current = messages.length;
    prevFirstIdRef.current = currFirstId;

    // Neu chi prepend (load more) → khong scroll xuong
    const didPrepend = prevFirstId && currFirstId && prevFirstId !== currFirstId;
    if (didPrepend) return;

    if (messages.length > prevLength) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  // Scroll xuong cuoi khi typing indicator bat
  useEffect(() => {
    if (isTypingAgent || isTypingAi) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isTypingAgent, isTypingAi]);

  // Load more khi scroll len top
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || !hasMore || isLoadingMore) return;
    if (el.scrollTop <= 32) {
      onLoadMore();
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 space-y-2 overflow-y-auto bg-white px-3 py-3 dark:bg-gray-950"
      role="log"
      aria-live="polite"
      aria-label="Lich su tin nhan"
    >
      {hasMore && (
        <div className="flex justify-center">
          {isLoadingMore ? (
            <span className="text-xs text-gray-400">Dang tai...</span>
          ) : (
            <button
              type="button"
              onClick={onLoadMore}
              className="rounded-full border border-gray-200 px-3 py-0.5 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Tai them
            </button>
          )}
        </div>
      )}

      {rendered.length === 0 && (
        <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
          Hay de lai loi nhan, chung toi se phan hoi som nhat.
        </div>
      )}

      {rendered.map((msg, idx) => (
        <ChatMessageItem
          key={msg.id}
          message={msg}
          showSender={showSenderFlags[idx] ?? true}
          onQuickReply={onQuickReply}
        />
      ))}

      {(isTypingAgent || isTypingAi) && (
        <div className="flex items-start">
          <ChatTypingIndicator />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
