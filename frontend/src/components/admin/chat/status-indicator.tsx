'use client';

import * as React from 'react';
import { Bot, Headphones, Clock, CheckCircle2, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConversationStatus } from '@/lib/api/modules/admin-chat.api';
import type { ChatMode } from '@/lib/types/chat';

/** Mapping status -> label + mau */
const STATUS_META: Record<
  ConversationStatus,
  { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  WAITING_AGENT: {
    label: 'Cho nhan vien',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    icon: Clock,
  },
  IN_PROGRESS: {
    label: 'Dang xu ly',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    icon: Headphones,
  },
  AI_RESPONDING: {
    label: 'AI tra loi',
    cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    icon: Bot,
  },
  CLOSED: {
    label: 'Da dong',
    cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    icon: CheckCircle2,
  },
  ARCHIVED: {
    label: 'Luu tru',
    cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    icon: Archive,
  },
};

/** Badge status cho conversation */
export function ConversationStatusBadge({
  status,
  className,
}: {
  status: ConversationStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        meta.cls,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

/** Icon mode (AI/Human/Hybrid/Offline) */
export function ModeIcon({ mode, className }: { mode: ChatMode; className?: string }) {
  if (mode === 'ai') return <Bot className={cn('h-4 w-4 text-purple-500', className)} aria-label="AI" />;
  if (mode === 'human') return <Headphones className={cn('h-4 w-4 text-blue-500', className)} aria-label="Nhan vien" />;
  if (mode === 'hybrid')
    return (
      <span className={cn('inline-flex items-center gap-0.5', className)} aria-label="Hybrid">
        <Bot className="h-3 w-3 text-purple-500" />
        <Headphones className="h-3 w-3 text-blue-500" />
      </span>
    );
  return <Archive className={cn('h-4 w-4 text-gray-400', className)} aria-label="Offline" />;
}
