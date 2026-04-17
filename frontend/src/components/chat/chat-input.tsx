'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Send, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_LENGTH = 5000;
const WARN_LENGTH = 4000;

interface Props {
  disabled?: boolean;
  placeholder?: string;
  onSend: (content: string) => void | Promise<void>;
  onTypingChange?: (isTyping: boolean) => void;
}

/**
 * Textarea auto-expand (toi da 3 rows), Enter de gui, Shift+Enter xuong dong.
 * Emit typing state co debounce de giam traffic WS.
 */
export function ChatInput({ disabled, placeholder, onSend, onTypingChange }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Auto resize textarea theo content
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 96); // ~3 rows
    el.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  useEffect(() => {
    return () => {
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    };
  }, []);

  const emitTyping = useCallback(
    (typing: boolean) => {
      if (!onTypingChange) return;
      if (isTypingRef.current !== typing) {
        onTypingChange(typing);
        isTypingRef.current = typing;
      }
    },
    [onTypingChange],
  );

  const handleChange = (val: string) => {
    if (val.length > MAX_LENGTH) val = val.slice(0, MAX_LENGTH);
    setValue(val);

    if (val.trim().length > 0) {
      emitTyping(true);
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
      stopTypingTimerRef.current = setTimeout(() => emitTyping(false), 1200);
    } else {
      emitTyping(false);
    }
  };

  const send = async () => {
    const content = value.trim();
    if (!content || disabled) return;
    setValue('');
    emitTyping(false);
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    await onSend(content);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const nearLimit = value.length > WARN_LENGTH;

  return (
    <div className="border-t border-gray-200 bg-white px-2 py-2 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-end gap-1.5">
        <button
          type="button"
          aria-label="Dinh kem (sap ra mat)"
          disabled
          title="Sap ra mat"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Nhap tin nhan...'}
          disabled={disabled}
          rows={1}
          maxLength={MAX_LENGTH}
          className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:bg-gray-900"
          aria-label="Noi dung tin nhan"
        />
        <button
          type="button"
          onClick={send}
          disabled={disabled || !value.trim()}
          aria-label="Gui tin nhan"
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700',
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {nearLimit && (
        <div
          className={cn(
            'mt-1 text-right text-[10px]',
            value.length >= MAX_LENGTH
              ? 'text-red-500'
              : 'text-gray-400 dark:text-gray-500',
          )}
        >
          {value.length}/{MAX_LENGTH}
        </div>
      )}
    </div>
  );
}
