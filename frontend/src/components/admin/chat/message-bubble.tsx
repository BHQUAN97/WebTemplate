'use client';

import * as React from 'react';
import { Bot, User as UserIcon, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types/chat';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Bubble hien thi mot tin nhan — theme khac nhau cho user / ai / agent
 */
export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isAgent = message.role === 'agent';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {message.content}
        </span>
      </div>
    );
  }

  const RoleIcon = isUser ? UserIcon : isAgent ? Headphones : Bot;

  return (
    <div className={cn('flex gap-2', isUser ? 'justify-start' : 'justify-end')}>
      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
          <RoleIcon className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
          isUser
            ? 'rounded-tl-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
            : isAgent
              ? 'rounded-tr-sm bg-blue-500 text-white'
              : 'rounded-tr-sm bg-gradient-to-br from-purple-500 to-indigo-500 text-white',
        )}
      >
        {message.sender?.name && !isUser && (
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
            {message.sender.name}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        <p className={cn('mt-1 text-[10px]', isUser ? 'text-gray-500' : 'text-white/70')}>
          {formatTime(message.createdAt)}
        </p>
      </div>
      {!isUser && (
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
            isAgent ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-purple-100 dark:bg-purple-900/40',
          )}
        >
          <RoleIcon className={cn('h-3.5 w-3.5', isAgent ? 'text-blue-600' : 'text-purple-600')} />
        </div>
      )}
    </div>
  );
}
