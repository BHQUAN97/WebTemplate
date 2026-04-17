'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ||
  'http://localhost:6001';

/**
 * Hook ket noi Socket.io — tu dong connect/disconnect va reconnect
 * @param userId - ID user de join room (optional)
 */
export function useSocket(userId?: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (userId) {
        socket.emit('join', { userId });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  /**
   * Lang nghe event tu server
   */
  const on = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: string, handler: (...args: any[]) => void) => {
      socketRef.current?.on(event, handler);
      return () => {
        socketRef.current?.off(event, handler);
      };
    },
    [],
  );

  /**
   * Gui event len server
   */
  const emit = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: string, ...args: any[]) => {
      socketRef.current?.emit(event, ...args);
    },
    [],
  );

  return { socket: socketRef, on, emit };
}
