'use client';

import * as React from 'react';
import { Mail, Phone, Globe, Monitor, MapPin, Tag } from 'lucide-react';
import type { AdminConversation } from '@/lib/api/modules/admin-chat.api';

/**
 * Panel phai hien thi thong tin khach + metadata + tags + notes
 */
export function ConversationInfoPanel({
  conversation,
}: {
  conversation: AdminConversation;
}) {
  const meta = conversation.metadata ?? {};

  return (
    <aside className="flex h-full w-full flex-col gap-4 overflow-y-auto border-l border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:w-72 lg:w-80">
      {/* Thong tin khach */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Thong tin khach
        </h3>
        <div className="space-y-2 text-sm">
          <p className="font-medium">
            {conversation.customerName ?? `Khach #${conversation.id.slice(-6).toUpperCase()}`}
          </p>
          {conversation.customerEmail && (
            <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{conversation.customerEmail}</span>
            </p>
          )}
          {conversation.customerPhone && (
            <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{conversation.customerPhone}</span>
            </p>
          )}
        </div>
      </section>

      {/* Metadata */}
      {(meta.ip || meta.userAgent || meta.pageUrl) && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Thong tin phien
          </h3>
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
            {meta.ip && (
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{String(meta.ip)}</span>
              </p>
            )}
            {meta.userAgent && (
              <p className="flex items-start gap-2">
                <Monitor className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="break-words">{String(meta.userAgent)}</span>
              </p>
            )}
            {meta.pageUrl && (
              <p className="flex items-start gap-2">
                <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="break-words text-blue-600">{String(meta.pageUrl)}</span>
              </p>
            )}
          </div>
        </section>
      )}

      {/* Tags */}
      {conversation.tags && conversation.tags.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {conversation.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <Tag className="h-3 w-3" />
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Thoi gian */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Thoi gian</h3>
        <dl className="space-y-1 text-xs">
          <div className="flex justify-between">
            <dt className="text-gray-500">Tao luc</dt>
            <dd>{new Date(conversation.createdAt).toLocaleString('vi-VN')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Cap nhat</dt>
            <dd>{new Date(conversation.updatedAt).toLocaleString('vi-VN')}</dd>
          </div>
          {conversation.closedAt && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Dong luc</dt>
              <dd>{new Date(conversation.closedAt).toLocaleString('vi-VN')}</dd>
            </div>
          )}
        </dl>
      </section>

      {conversation.feedback && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Phan hoi</h3>
          <p className="text-sm text-gray-700 dark:text-gray-200">{conversation.feedback}</p>
          {conversation.rating != null && (
            <p className="mt-1 text-xs text-yellow-600">Danh gia: {conversation.rating}/5</p>
          )}
        </section>
      )}
    </aside>
  );
}
