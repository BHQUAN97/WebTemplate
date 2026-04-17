'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { MessageBubble } from './message-bubble';
import { EmptyState } from '@/components/shared/empty-state';
import type { ChatMessage } from '@/lib/types/chat';

interface Props {
  messages: ChatMessage[];
  loading?: boolean;
}

/**
 * Hien thi danh sach tin nhan — auto scroll xuong cuoi khi co tin moi
 */
export function AdminMessageList({ messages, loading }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Auto-scroll xuong cuoi khi co tin moi
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <EmptyState title="Chua co tin nhan" description="Bat dau cuoc tro chuyen bang cach gui tin nhan." />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
    </div>
  );
}
