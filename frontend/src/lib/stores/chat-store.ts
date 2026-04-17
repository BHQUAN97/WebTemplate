import { create } from 'zustand';
import {
  chatApi,
  readChatSession,
  writeChatSession,
  type PersistedChatSession,
} from '@/lib/api/modules/chat.api';
import type {
  ChatAgent,
  ChatMessage,
  ChatMode,
  StartChatInput,
} from '@/lib/types/chat';

type TypingState = { agent: boolean; ai: boolean };

interface ChatState {
  conversationId: string | null;
  customerSessionId: string | null;
  messages: ChatMessage[];
  isOpen: boolean;
  isConnected: boolean;
  isTyping: TypingState;
  agent: ChatAgent | null;
  mode: ChatMode | null;
  unreadCount: number;
  hasMoreMessages: boolean;
  isLoading: boolean;
  isStarting: boolean;
  hasRestored: boolean;
  error: string | null;

  // Actions — UI
  toggleOpen: () => void;
  openWidget: () => void;
  closeWidget: () => void;

  // Actions — Session
  restoreSession: () => Promise<void>;
  startConversation: (profile?: StartChatInput) => Promise<void>;
  resetSession: () => void;

  // Actions — Messaging
  sendMessage: (content: string) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  prependMessages: (messages: ChatMessage[]) => void;
  loadMoreMessages: () => Promise<void>;

  // Actions — Realtime
  setConnected: (connected: boolean) => void;
  setTyping: (who: keyof TypingState, isTyping: boolean) => void;
  setAgent: (agent: ChatAgent | null) => void;
  setMode: (mode: ChatMode | null) => void;
  markAllRead: () => void;
}

/**
 * Ghi session xuong localStorage — wrapper goi tu store actions.
 * Giu nguyen: luu chung phan 1 lan, doc ra lai khi mount.
 */
function persist(session: PersistedChatSession | null) {
  writeChatSession(session);
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversationId: null,
  customerSessionId: null,
  messages: [],
  isOpen: false,
  isConnected: false,
  isTyping: { agent: false, ai: false },
  agent: null,
  mode: null,
  unreadCount: 0,
  hasMoreMessages: false,
  isLoading: false,
  isStarting: false,
  hasRestored: false,
  error: null,

  toggleOpen: () =>
    set((state) => ({
      isOpen: !state.isOpen,
      unreadCount: state.isOpen ? state.unreadCount : 0,
    })),

  openWidget: () => set({ isOpen: true, unreadCount: 0 }),

  closeWidget: () => set({ isOpen: false }),

  /**
   * Restore session tu localStorage khi widget mount lan dau.
   * Neu session invalid (vd: BE da xoa) → clear va cho khach start lai.
   */
  restoreSession: async () => {
    if (get().hasRestored) return;
    const session = readChatSession();
    if (!session) {
      set({ hasRestored: true });
      return;
    }

    set({
      conversationId: session.conversationId,
      customerSessionId: session.customerSessionId,
      isLoading: true,
      error: null,
    });

    try {
      const conversation = await chatApi.getConversation(session.conversationId);
      const messages = await chatApi.getMessages(session.conversationId, {
        limit: 30,
      });
      // BE tra ve desc → reverse de render asc (cu → moi)
      const ordered = [...messages].reverse();
      set({
        agent: conversation.agent ?? null,
        mode: conversation.mode ?? null,
        messages: ordered,
        hasMoreMessages: messages.length >= 30,
        isLoading: false,
        hasRestored: true,
      });
    } catch (err) {
      // Session ko hop le → reset hoan toan
      persist(null);
      set({
        conversationId: null,
        customerSessionId: null,
        messages: [],
        agent: null,
        mode: null,
        hasMoreMessages: false,
        isLoading: false,
        hasRestored: true,
        error: err instanceof Error ? err.message : 'Khong khoi phuc duoc phien',
      });
    }
  },

  /**
   * Tao conversation moi — goi API, nhan session id, persist, nap message khoi dau.
   */
  startConversation: async (profile) => {
    if (get().isStarting) return;
    set({ isStarting: true, error: null });
    try {
      const res = await chatApi.startConversation(profile ?? {});
      const session: PersistedChatSession = {
        conversationId: res.id,
        customerSessionId: res.customerSessionId,
      };
      persist(session);
      set({
        conversationId: res.id,
        customerSessionId: res.customerSessionId,
        agent: res.agent ?? null,
        mode: res.mode ?? null,
        messages: res.messages ?? [],
        hasMoreMessages: false,
        isStarting: false,
        hasRestored: true,
        isOpen: true,
      });
    } catch (err) {
      set({
        isStarting: false,
        error: err instanceof Error ? err.message : 'Khong tao duoc phien chat',
      });
      throw err;
    }
  },

  /**
   * Xoa session — dung khi khach bam "Ket thuc chat" hoac session invalid.
   */
  resetSession: () => {
    persist(null);
    set({
      conversationId: null,
      customerSessionId: null,
      messages: [],
      agent: null,
      mode: null,
      isConnected: false,
      isTyping: { agent: false, ai: false },
      unreadCount: 0,
      hasMoreMessages: false,
      error: null,
    });
  },

  /**
   * Gui tin — optimistic append, fallback REST (luc WS down thi caller truyen
   * vao the hook socket; default ve day se fallback REST luon).
   */
  sendMessage: async (content) => {
    const { conversationId } = get();
    if (!conversationId || !content.trim()) return;
    try {
      const msg = await chatApi.sendMessage(conversationId, content.trim());
      // Neu BE da echo qua WS thi de addMessage dedupe, con chua thi append luon
      get().addMessage(msg);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Gui tin that bai',
      });
      throw err;
    }
  },

  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state;
      const next = [...state.messages, message];
      const incoming = message.role !== 'user';
      return {
        messages: next,
        unreadCount:
          incoming && !state.isOpen ? state.unreadCount + 1 : state.unreadCount,
      };
    }),

  prependMessages: (older) =>
    set((state) => {
      const existing = new Set(state.messages.map((m) => m.id));
      const deduped = older.filter((m) => !existing.has(m.id));
      return { messages: [...deduped, ...state.messages] };
    }),

  /**
   * Load older messages khi user scroll len dau list.
   */
  loadMoreMessages: async () => {
    const { conversationId, messages, hasMoreMessages, isLoading } = get();
    if (!conversationId || !hasMoreMessages || isLoading) return;
    const oldest = messages[0];
    if (!oldest) return;
    set({ isLoading: true });
    try {
      const older = await chatApi.getMessages(conversationId, {
        before: oldest.id,
        limit: 30,
      });
      const ordered = [...older].reverse();
      get().prependMessages(ordered);
      set({
        hasMoreMessages: older.length >= 30,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Tai them tin that bai',
      });
    }
  },

  setConnected: (connected) => set({ isConnected: connected }),

  setTyping: (who, isTyping) =>
    set((state) => ({ isTyping: { ...state.isTyping, [who]: isTyping } })),

  setAgent: (agent) => set({ agent }),

  setMode: (mode) => set({ mode }),

  markAllRead: () => set({ unreadCount: 0 }),
}));
