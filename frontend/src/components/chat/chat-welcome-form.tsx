'use client';

import { useState, type FormEvent } from 'react';
import { MessageCircle } from 'lucide-react';

interface Props {
  isSubmitting: boolean;
  error?: string | null;
  onStart: (profile: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    initialMessage: string;
  }) => Promise<void> | void;
  onSkip: () => Promise<void> | void;
}

/**
 * Form chao hoi lan dau — khach co the dien ten/email/phone optional,
 * chi tin nhan dau la bat buoc. "Bat dau chat" de di cho ba kenh cua hang.
 */
export function ChatWelcomeForm({ isSubmitting, error, onStart, onSkip }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;
    await onStart({
      customerName: name.trim() || undefined,
      customerEmail: email.trim() || undefined,
      customerPhone: phone.trim() || undefined,
      initialMessage: message.trim(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col gap-3 overflow-y-auto bg-white p-4 dark:bg-gray-950"
    >
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
        <MessageCircle className="h-5 w-5 text-blue-600" />
        <h2 className="text-base font-semibold">Xin chao! Chung toi co the giup gi?</h2>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        De lai thong tin (khong bat buoc) de chung toi ho tro tot hon.
      </p>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ho ten"
        autoComplete="name"
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="So dien thoai"
        autoComplete="tel"
        pattern="[0-9]*"
        inputMode="tel"
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Tin nhan dau tien... (bat buoc)"
        rows={3}
        required
        className="resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />

      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <button
          type="submit"
          disabled={!message.trim() || isSubmitting}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Dang mo phien...' : 'Bat dau chat'}
        </button>
        <button
          type="button"
          onClick={() => onSkip()}
          disabled={isSubmitting}
          className="inline-flex h-9 items-center justify-center rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Bo qua, chat an danh
        </button>
      </div>
    </form>
  );
}
