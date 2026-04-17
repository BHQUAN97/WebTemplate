import { apiClient } from '../client';
import type {
  ChatConversation,
  ChatMessage,
  GetMessagesParams,
  StartChatInput,
  StartChatResponse,
} from '@/lib/types/chat';

/**
 * localStorage key chua session cua khach de BE nhan biet owner cua
 * conversation (do khach chua login → khong co user id).
 */
export const CHAT_SESSION_STORAGE_KEY = 'chat.session.v1';

export interface PersistedChatSession {
  conversationId: string;
  customerSessionId: string;
}

/**
 * Doc session khach hang tu localStorage — SSR safe.
 */
export function readChatSession(): PersistedChatSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CHAT_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedChatSession>;
    if (!parsed?.conversationId || !parsed?.customerSessionId) return null;
    return {
      conversationId: parsed.conversationId,
      customerSessionId: parsed.customerSessionId,
    };
  } catch {
    return null;
  }
}

/**
 * Ghi session khach hang xuong localStorage — SSR safe.
 */
export function writeChatSession(session: PersistedChatSession | null) {
  if (typeof window === 'undefined') return;
  if (!session) {
    window.localStorage.removeItem(CHAT_SESSION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(
    CHAT_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );
}

/**
 * Build headers ke customer session nau da ton tai.
 * Dung cho tat ca request chat (BE verify session = conversation owner).
 */
function chatHeaders(): Record<string, string> {
  const session = readChatSession();
  if (!session) return {};
  return { 'x-customer-session-id': session.customerSessionId };
}

export const chatApi = {
  /**
   * Khoi tao conversation moi — BE sinh customerSessionId va id.
   * FE phai persist ket qua (conversationId + customerSessionId).
   */
  startConversation(input: StartChatInput) {
    return apiClient.request<StartChatResponse>('/chat/conversations', {
      method: 'POST',
      body: { channel: 'web', ...input },
    });
  },

  /**
   * Lay chi tiet conversation — yeu cau header x-customer-session-id.
   * Dung khi restore session tu localStorage.
   */
  getConversation(id: string) {
    return apiClient.request<ChatConversation>(`/chat/conversations/${id}`, {
      headers: chatHeaders(),
    });
  },

  /**
   * Lay messages voi cursor pagination (before = message id).
   * BE tra ve messages sap xep giam theo createdAt (moi nhat truoc).
   */
  getMessages(id: string, params?: GetMessagesParams) {
    const query: Record<string, string | number | undefined> = {};
    if (params?.before) query.before = params.before;
    if (params?.limit) query.limit = params.limit;
    return apiClient.request<ChatMessage[]>(`/chat/conversations/${id}/messages`, {
      params: query,
      headers: chatHeaders(),
    });
  },

  /**
   * Gui message qua REST — fallback khi WebSocket down.
   */
  sendMessage(id: string, content: string, type: string = 'text') {
    return apiClient.request<ChatMessage>(
      `/chat/conversations/${id}/messages`,
      {
        method: 'POST',
        body: { content, type },
        headers: chatHeaders(),
      },
    );
  },
};

export type ChatApi = typeof chatApi;
