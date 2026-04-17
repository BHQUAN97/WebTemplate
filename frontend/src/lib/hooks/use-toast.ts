'use client';

import { useState, useCallback } from 'react';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

// Global state cho toast — chia se giua cac component
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

  // Tu dong xoa sau 5 giay
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
 * Hook quan ly toast notifications
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastQueue);

  // Subscribe vao global state
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

// Export truc tiep de dung ngoai component
export const toast = addToast;
