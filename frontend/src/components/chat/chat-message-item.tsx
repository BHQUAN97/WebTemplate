'use client';

import { memo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ChatMessage, ChatQuickReply } from '@/lib/types/chat';

interface Props {
  message: ChatMessage;
  showSender: boolean;
  onQuickReply?: (reply: ChatQuickReply) => void;
}

/**
 * Format so tien theo VND — don gian, khong can Intl full de tranh SSR mismatch.
 */
function formatPrice(value: number) {
  try {
    return new Intl.NumberFormat('vi-VN').format(value) + ' d';
  } catch {
    return `${value} d`;
  }
}

/**
 * Time label ngan: HH:mm
 */
function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return '';
  }
}

function ChatMessageItemBase({ message, showSender, onQuickReply }: Props) {
  const role = message.role;
  const isUser = role === 'user';
  const isSystem = role === 'system';

  // System event — block giua, muted, khong bubble
  if (isSystem || message.type === 'system_event') {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {message.content}
        </span>
      </div>
    );
  }

  const alignment = isUser ? 'items-end' : 'items-start';
  const bubbleTone = isUser
    ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
    : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm dark:bg-gray-800 dark:text-gray-100';

  const senderLabel = !isUser && showSender
    ? message.sender?.name || (role === 'ai' ? 'Tro ly AI' : 'Nhan vien')
    : null;

  return (
    <div className={cn('flex w-full flex-col gap-0.5', alignment)}>
      {senderLabel && (
        <span className="px-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
          {senderLabel}
        </span>
      )}

      {/* Text bubble */}
      {message.type === 'text' && (
        <div className={cn('max-w-[80%] break-words px-3 py-2 text-sm', bubbleTone)}>
          {message.content}
        </div>
      )}

      {/* Product card */}
      {message.type === 'product_card' && message.metadata?.product && (
        <div className="max-w-[80%] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {message.metadata.product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.metadata.product.imageUrl}
              alt={message.metadata.product.name}
              className="h-32 w-full object-cover"
              loading="lazy"
            />
          )}
          <div className="space-y-1 p-2">
            <p className="line-clamp-2 text-sm font-medium">
              {message.metadata.product.name}
            </p>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {formatPrice(message.metadata.product.price)}
            </p>
            {message.metadata.product.url && (
              <Link
                href={message.metadata.product.url}
                className="mt-1 inline-flex rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                Xem
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Order card */}
      {message.type === 'order_card' && message.metadata?.order && (
        <div className="max-w-[80%] rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="font-medium">Don hang #{message.metadata.order.code}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Trang thai: {message.metadata.order.status}
          </p>
          <p className="mt-1 font-semibold text-blue-600 dark:text-blue-400">
            {formatPrice(message.metadata.order.total)}
          </p>
        </div>
      )}

      {/* Quick replies */}
      {message.type === 'quick_replies' && (
        <>
          {message.content && (
            <div className={cn('max-w-[80%] px-3 py-2 text-sm', bubbleTone)}>
              {message.content}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(message.metadata?.quickReplies ?? []).map((qr, idx) => (
              <button
                key={`${qr.payload}-${idx}`}
                type="button"
                onClick={() => onQuickReply?.(qr)}
                className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
              >
                {qr.label}
              </button>
            ))}
          </div>
        </>
      )}

      <span className="px-1 text-[10px] text-gray-400 dark:text-gray-500">
        {formatTime(message.createdAt)}
      </span>
    </div>
  );
}

export const ChatMessageItem = memo(ChatMessageItemBase);
