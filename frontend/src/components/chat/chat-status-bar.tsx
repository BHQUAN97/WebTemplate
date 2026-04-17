'use client';

import { Bot, User2, Clock } from 'lucide-react';
import type { ChatAgent, ChatMode } from '@/lib/types/chat';
import { cn } from '@/lib/utils';

interface Props {
  mode: ChatMode | null;
  agent: ChatAgent | null;
  isConnected: boolean;
}

/**
 * Hien thi mode hien tai cua conversation — AI, nhan vien, hoac ngoai gio.
 * Them 1 dot nho the hien trang thai WS connected.
 */
export function ChatStatusBar({ mode, agent, isConnected }: Props) {
  let icon = <Bot className="h-4 w-4" />;
  let label = 'AI dang ho tro';
  let tone = 'text-blue-600 dark:text-blue-400';

  if (mode === 'human' && agent?.name) {
    icon = <User2 className="h-4 w-4" />;
    label = `Nhan vien ${agent.name} dang tra loi`;
    tone = 'text-emerald-600 dark:text-emerald-400';
  } else if (mode === 'hybrid') {
    icon = <User2 className="h-4 w-4" />;
    label = 'AI + nhan vien cung ho tro';
    tone = 'text-emerald-600 dark:text-emerald-400';
  } else if (mode === 'offline') {
    icon = <Clock className="h-4 w-4" />;
    label = 'Ngoai gio truc — se phan hoi som';
    tone = 'text-amber-600 dark:text-amber-400';
  }

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs dark:border-gray-800 dark:bg-gray-900">
      <span className={cn('flex items-center gap-1.5 font-medium', tone)}>
        {icon}
        {label}
      </span>
      <span
        className={cn(
          'flex items-center gap-1 text-gray-500 dark:text-gray-400',
          !isConnected && 'text-red-500 dark:text-red-400',
        )}
        aria-live="polite"
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            isConnected ? 'bg-emerald-500' : 'bg-red-500',
          )}
        />
        {isConnected ? 'Da ket noi' : 'Mat ket noi'}
      </span>
    </div>
  );
}
