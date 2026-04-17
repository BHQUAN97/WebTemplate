'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useNotificationStore } from '@/lib/stores/notification.store';
import { notificationsApi } from '@/lib/api/modules/notifications.api';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Notification } from '@/lib/types';

const SOCKET_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ||
  'http://localhost:6001';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  connected: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook notifications — ket noi socket.io namespace /notifications
 * - Auto subscribe vao cac event: notification:new, notification:read
 * - Auto reconnect khi disconnect
 * - Fetch initial list tu REST
 */
export function useNotifications(): UseNotificationsReturn {
  const user = useAuthStore((s) => s.user);
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const markReadStore = useNotificationStore((s) => s.markRead);
  const markAllReadStore = useNotificationStore((s) => s.markAllRead);

  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Fetch initial data
  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        notificationsApi.getNotifications({ page: 1, limit: 20 }),
        notificationsApi.getUnreadCount(),
      ]);
      // API tra ve array truc tiep hoac boc trong data — ho tro ca 2
      const items = Array.isArray(list)
        ? list
        : ((list as unknown as { data?: Notification[] }).data ?? []);
      setNotifications(items);
      setUnreadCount(count?.count ?? 0);
    } catch {
      // Im lang — neu user chua dang nhap thi khong can alarm
    }
  }, [setNotifications, setUnreadCount]);

  useEffect(() => {
    if (!user) return;

    // Initial load
    refresh();

    // Socket.io ket noi namespace /notifications
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('access_token') ||
          sessionStorage.getItem('access_token')
        : null;

    const socket = io(`${SOCKET_BASE}/notifications`, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('subscribe', { userId: user.id });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('notification:new', (notif: Notification) => {
      addNotification(notif);
    });

    socket.on('notification:read', (payload: { id: string }) => {
      if (payload?.id) markReadStore(payload.id);
    });

    socket.on(
      'notification:read-all',
      () => {
        markAllReadStore();
      },
    );

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAsRead = useCallback(
    async (id: string) => {
      markReadStore(id);
      try {
        await notificationsApi.markRead(id);
      } catch {
        // rollback tren UI neu can — don gian bo qua
      }
    },
    [markReadStore],
  );

  const markAllAsRead = useCallback(async () => {
    markAllReadStore();
    try {
      await notificationsApi.markAllRead();
    } catch {
      // bo qua
    }
  }, [markAllReadStore]);

  return {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}
