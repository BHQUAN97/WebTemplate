'use client';

import { useCallback, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useChatStore } from '@/lib/stores/chat-store';
import type { ChatAgent, ChatMessage, ChatMode } from '@/lib/types/chat';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ||
  'http://localhost:6001';

interface ConversationUpdatedPayload {
  mode?: ChatMode;
  agent?: ChatAgent | null;
}

interface AgentAssignedPayload {
  agent: ChatAgent;
}

interface TypingPayload {
  who: 'agent' | 'ai';
  isTyping: boolean;
}

/**
 * Hook ket noi WebSocket cho chat widget — chi hoat dong khi co conversation.
 * Auto reconnect, dispatch events vao store, cung cap emitters an toan.
 */
export function useChatSocket() {
  const conversationId = useChatStore((s) => s.conversationId);
  const customerSessionId = useChatStore((s) => s.customerSessionId);

  const addMessage = useChatStore((s) => s.addMessage);
  const setConnected = useChatStore((s) => s.setConnected);
  const setTyping = useChatStore((s) => s.setTyping);
  const setAgent = useChatStore((s) => s.setAgent);
  const setMode = useChatStore((s) => s.setMode);

  const socketRef = useRef<Socket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingStateRef = useRef<boolean>(false);

  useEffect(() => {
    // Chua co conversation → ko mo socket
    if (!conversationId || !customerSessionId) {
      return;
    }

    const socket = io(`${SOCKET_URL}/chat`, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
      auth: { conversationId, customerSessionId },
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('chat:message', (payload: ChatMessage) => {
      if (!payload?.id) return;
      addMessage(payload);
      // Tin moi den → tat typing tuong ung de tranh indicator ket dinh
      if (payload.role === 'agent') setTyping('agent', false);
      if (payload.role === 'ai') setTyping('ai', false);
    });

    socket.on('chat:typing', (payload: TypingPayload) => {
      if (!payload?.who) return;
      setTyping(payload.who, Boolean(payload.isTyping));
    });

    socket.on('chat:conversation-updated', (payload: ConversationUpdatedPayload) => {
      if (payload?.mode) setMode(payload.mode);
      if (payload?.agent !== undefined) setAgent(payload.agent ?? null);
    });

    socket.on('chat:agent-assigned', (payload: AgentAssignedPayload) => {
      if (payload?.agent) {
        setAgent(payload.agent);
        setMode('human');
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [conversationId, customerSessionId, addMessage, setConnected, setTyping, setAgent, setMode]);

  /**
   * Emit typing — debounce 1000ms tu dong tat typing khi ngung go.
   * Chi emit khi state thay doi de giam traffic.
   */
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const socket = socketRef.current;
      if (!socket?.connected) return;

      if (lastTypingStateRef.current !== isTyping) {
        socket.emit('typing', { isTyping });
        lastTypingStateRef.current = isTyping;
      }

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }

      if (isTyping) {
        typingTimerRef.current = setTimeout(() => {
          socket.emit('typing', { isTyping: false });
          lastTypingStateRef.current = false;
          typingTimerRef.current = null;
        }, 1000);
      }
    },
    [],
  );

  /**
   * Gui tin qua WS — tra ve true neu socket connected, false de caller fallback REST.
   */
  const sendMessage = useCallback((content: string, type: string = 'text') => {
    const socket = socketRef.current;
    if (!socket?.connected) return false;
    socket.emit('message:send', { content, type });
    return true;
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  return { sendTyping, sendMessage };
}

export type UseChatSocket = ReturnType<typeof useChatSocket>;
