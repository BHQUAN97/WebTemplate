'use client';

import * as React from 'react';
import { ArrowLeft, UserPlus, XCircle, Info, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConversationStatusBadge, ModeIcon } from './status-indicator';
import { AdminMessageList } from './message-list';
import { MessageComposer, type CannedResponse } from './message-composer';
import { ConversationInfoPanel } from './conversation-info-panel';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import type { AdminConversation } from '@/lib/api/modules/admin-chat.api';
import type { ChatMessage } from '@/lib/types/chat';

interface Props {
  conversation: AdminConversation | null;
  messages: ChatMessage[];
  loading?: boolean;
  sending?: boolean;
  onBack?: () => void; // mobile
  onSend: (content: string) => Promise<void> | void;
  onAssignSelf?: () => void;
  onClose?: () => void;
  onTransfer?: () => void;
  cannedResponses?: CannedResponse[];
}

/**
 * Pane phai — header + messages + composer + info panel (collapsible).
 * Responsive: info panel an tren mobile, toggle bang nut "Info".
 */
export function ConversationDetail({
  conversation,
  messages,
  loading,
  sending,
  onBack,
  onSend,
  onAssignSelf,
  onClose,
  onTransfer,
  cannedResponses,
}: Props) {
  const [showInfo, setShowInfo] = React.useState(false);
  const [confirmClose, setConfirmClose] = React.useState(false);

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
        Chon mot cuoc tro chuyen de bat dau
      </div>
    );
  }

  const isClosed = conversation.status === 'CLOSED' || conversation.status === 'ARCHIVED';
  const customerName =
    conversation.customerName?.trim() || `Khach #${conversation.id.slice(-6).toUpperCase()}`;

  return (
    <div className="flex h-full flex-1 min-w-0">
      {/* Main column */}
      <div className="flex h-full min-w-0 flex-1 flex-col bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Quay lai">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ModeIcon mode={conversation.mode} />
              <p className="truncate font-semibold">{customerName}</p>
              <ConversationStatusBadge status={conversation.status} />
            </div>
            <p className="truncate text-xs text-gray-500">
              {conversation.channel.toUpperCase()}
              {conversation.agent?.name ? ` • ${conversation.agent.name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {!isClosed && onAssignSelf && (
              <Button variant="outline" size="sm" onClick={onAssignSelf} title="Nhan cuoc chat">
                <UserPlus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Nhan</span>
              </Button>
            )}
            {!isClosed && onTransfer && (
              <Button variant="outline" size="sm" onClick={onTransfer} title="Chuyen cho nhan vien khac">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            {!isClosed && onClose && (
              <Button variant="outline" size="sm" onClick={() => setConfirmClose(true)} title="Dong cuoc chat">
                <XCircle className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowInfo((v) => !v)}
              title="Thong tin"
              className={cn(showInfo && 'bg-gray-100 dark:bg-gray-800')}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <AdminMessageList messages={messages} loading={loading} />

        {/* Composer */}
        {isClosed ? (
          <div className="border-t border-gray-200 bg-gray-100 px-4 py-3 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-800/50">
            Cuoc tro chuyen da dong
          </div>
        ) : (
          <MessageComposer
            onSend={onSend}
            loading={sending}
            cannedResponses={cannedResponses}
          />
        )}
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="hidden md:block">
          <ConversationInfoPanel conversation={conversation} />
        </div>
      )}

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Dong cuoc tro chuyen"
        description="Sau khi dong, ban khong the gui them tin nhan. Tiep tuc?"
        confirmLabel="Dong cuoc chat"
        variant="danger"
        onConfirm={() => {
          setConfirmClose(false);
          onClose?.();
        }}
      />
    </div>
  );
}

// Re-export de page dung chung
export { ConversationInfoPanel };
