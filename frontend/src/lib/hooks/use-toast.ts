'use client';

import { useState, useCallback } from 'react';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

// Global state cho toast — chia sẻ giữa các component
let listeners: Array<(toasts: Toast[]) => void> = [];
let toastQueue: Toast[] = [];
let toastCounter = 0;

function emitChange() {
  listeners.forEach((listener) => listener([...toastQueue]));
}

function addToast(
  title: string,
  description?: string,
  variant: ToastVariant = 'default',
) {
  const id = String(++toastCounter);
  toastQueue.push({ id, title, description, variant });
  emitChange();

  // Tự động xóa sau 5 giây
  setTimeout(() => {
    removeToast(id);
  }, 5000);

  return id;
}

function removeToast(id: string) {
  toastQueue = toastQueue.filter((t) => t.id !== id);
  emitChange();
}

/**
 * Hook quản lý toast notifications
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastQueue);

  // Subscribe vào global state
  useState(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  });

  const toast = useCallback(
    (title: string, description?: string, variant: ToastVariant = 'default') =>
      addToast(title, description, variant),
    [],
  );

  const dismiss = useCallback((id: string) => removeToast(id), []);

  return { toasts, toast, dismiss };
}

// Export trực tiếp để dùng ngoài component
export const toast = addToast;
