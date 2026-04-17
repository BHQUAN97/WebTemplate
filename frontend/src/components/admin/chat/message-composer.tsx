'use client';

import * as React from 'react';
import { Send, Paperclip, MessageSquareQuote, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface CannedResponse {
  id: string;
  label: string;
  content: string;
}

interface Props {
  onSend: (content: string) => Promise<void> | void;
  disabled?: boolean;
  loading?: boolean;
  cannedResponses?: CannedResponse[];
  onAttachment?: (file: File) => void;
}

/**
 * Composer gui tin nhan — textarea + toolbar (canned, attachment, send)
 * Enter = send, Shift+Enter = xuong dong.
 */
export function MessageComposer({
  onSend,
  disabled,
  loading,
  cannedResponses = [],
  onAttachment,
}: Props) {
  const [value, setValue] = React.useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);

  const canSend = value.trim().length > 0 && !disabled && !loading;

  const handleSend = async () => {
    if (!canSend) return;
    const content = value.trim();
    setValue('');
    await onSend(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAttachment) onAttachment(file);
    // Reset de chon lai cung file
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="border-t border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nhap tin nhan... (Enter de gui, Shift+Enter de xuong dong)"
        rows={2}
        disabled={disabled}
        className="min-h-[56px] resize-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Canned responses dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled || cannedResponses.length === 0}
                title="Tin nhan mau"
              >
                <MessageSquareQuote className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-72 overflow-y-auto">
              {cannedResponses.length === 0 ? (
                <DropdownMenuItem disabled>Chua co tin nhan mau</DropdownMenuItem>
              ) : (
                cannedResponses.map((c) => (
                  <DropdownMenuItem key={c.id} onClick={() => setValue((v) => (v ? v + '\n' + c.content : c.content))}>
                    <div className="flex flex-col">
                      <span className="font-medium">{c.label}</span>
                      <span className="truncate text-xs text-gray-500">{c.content}</span>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Attachment */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || !onAttachment}
            onClick={() => fileRef.current?.click()}
            title="Dinh kem"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
        </div>

        <Button type="button" onClick={handleSend} disabled={!canSend} className={cn(loading && 'opacity-70')}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="ml-2 hidden sm:inline">Gui</span>
        </Button>
      </div>
    </div>
  );
}
