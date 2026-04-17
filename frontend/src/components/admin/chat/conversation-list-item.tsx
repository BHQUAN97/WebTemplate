'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ModeIcon } from './status-indicator';
import type { AdminConversation } from '@/lib/api/modules/admin-chat.api';

/** Format timestamp relative don gian (khong can library ngoai) */
function relativeTime(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'vua xong';
  if (mins < 60) return `${mins} phut`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} gio`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngay`;
  return date.toLocaleDateString('vi-VN');
}

/** Lay chu cai dau ten khach lam avatar fallback */
function initials(name?: string | null, id?: string): string {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }
  return id ? id.slice(-2).toUpperCase() : '?';
}

interface Props {
  conversation: AdminConversation;
  active?: boolean;
  onClick?: () => void;
}

/**
 * Item trong danh sach conversation — avatar + ten + preview + unread badge
 */
export function ConversationListItem({ conversation, active, onClick }: Props) {
  const name =
    conversation.customerName?.trim() ||
    `Khach #${conversation.id.slice(-6).toUpperCase()}`;
  const preview = conversation.lastMessage ?? '(Chua co tin nhan)';
  const unread = conversation.unreadCount ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-blue-300 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-950/40'
          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50',
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {conversation.customerAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={conversation.customerAvatarUrl}
            alt={name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-xs font-semibold text-white">
            {initials(conversation.customerName, conversation.id)}
          </div>
        )}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('truncate text-sm', unread > 0 ? 'font-semibold' : 'font-medium')}>
            {name}
          </p>
          <span className="shrink-0 text-[11px] text-gray-400">
            {relativeTime(conversation.lastMessageAt ?? conversation.updatedAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <ModeIcon mode={conversation.mode} className="shrink-0" />
          <p className={cn('truncate text-xs', unread > 0 ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500')}>
            {preview}
          </p>
        </div>
      </div>
    </button>
  );
}
