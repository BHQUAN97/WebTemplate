// ============================================================
// Admin Chat API — conversations, scenarios, schedules
// Dung chung apiClient (da tu dong attach Bearer token).
// ============================================================

import { apiClient } from '../client';
import type {
  ApiResponse,
  PaginationMeta,
} from '@/lib/types';
import type {
  ChatChannel,
  ChatMessage,
  ChatMode,
} from '@/lib/types/chat';

// --- Enums / unions danh rieng cho admin ---

export type ConversationStatus =
  | 'WAITING_AGENT'
  | 'IN_PROGRESS'
  | 'AI_RESPONDING'
  | 'CLOSED'
  | 'ARCHIVED';

export type ScenarioTriggerType =
  | 'keyword'
  | 'intent'
  | 'event'
  | 'fallback'
  | 'schedule';

export type ScenarioResponseType = 'text' | 'template' | 'quick_reply' | 'product' | 'order';

// --- Entity types ---

export interface AdminConversation {
  id: string;
  channel: ChatChannel;
  mode: ChatMode;
  status: ConversationStatus;
  customerSessionId?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAvatarUrl?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
  agent?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  } | null;
  tags?: string[];
  metadata?: {
    ip?: string;
    userAgent?: string;
    pageUrl?: string;
    referrer?: string;
    [k: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  rating?: number | null;
  feedback?: string | null;
}

export interface ChatScenario {
  id: string;
  name: string;
  description?: string | null;
  triggerType: ScenarioTriggerType;
  triggerValue: string;
  conditions?: Record<string, unknown> | null;
  response: string;
  responseType: ScenarioResponseType;
  followUpScenarioId?: string | null;
  followUpScenario?: ChatScenario | null;
  delayMs?: number;
  priority: number;
  matchCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSchedule {
  id: string;
  name: string;
  daysOfWeek: number[]; // 0=CN, 1=T2, ... 6=T7
  startTime: string; // "HH:mm"
  endTime: string;
  mode: ChatMode;
  timezone?: string;
  priority: number;
  fallbackMessage?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Request / response shapes ---

export interface ListConversationsParams {
  status?: ConversationStatus | 'all';
  mode?: ChatMode | 'all';
  agentId?: string;
  channel?: ChatChannel | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

export interface SendMessageInput {
  content: string;
  type?: 'text' | 'product_card' | 'order_card';
  metadata?: Record<string, unknown>;
}

export interface CloseConversationInput {
  rating?: number;
  feedback?: string;
}

export interface CreateScenarioInput {
  name: string;
  description?: string;
  triggerType: ScenarioTriggerType;
  triggerValue: string;
  conditions?: Record<string, unknown> | null;
  response: string;
  responseType: ScenarioResponseType;
  followUpScenarioId?: string | null;
  delayMs?: number;
  priority: number;
  isActive: boolean;
}

export type UpdateScenarioInput = Partial<CreateScenarioInput>;

export interface CreateScheduleInput {
  name: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  mode: ChatMode;
  timezone?: string;
  priority: number;
  fallbackMessage?: string;
  isActive: boolean;
}

export type UpdateScheduleInput = Partial<CreateScheduleInput>;

// --- API module ---

/**
 * Admin Chat API — wrap tat ca endpoint admin chat.
 * Dung apiClient (attach Bearer token tu local/session storage).
 */
export const adminChatApi = {
  // === Conversations ===

  listConversations(params: ListConversationsParams = {}) {
    const q: Record<string, string | number | undefined> = {
      page: params.page,
      limit: params.limit,
      search: params.search,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      mode: params.mode && params.mode !== 'all' ? params.mode : undefined,
      agentId: params.agentId,
      channel: params.channel && params.channel !== 'all' ? params.channel : undefined,
    };
    return apiClient.get<ApiResponse<AdminConversation[]> & { pagination?: PaginationMeta }>(
      '/admin/chat/conversations',
      q,
    );
  },

  getConversation(id: string) {
    return apiClient.get<AdminConversation>(`/admin/chat/conversations/${id}`);
  },

  getMessages(id: string, params?: { before?: string; limit?: number }) {
    return apiClient.get<ChatMessage[]>(
      `/admin/chat/conversations/${id}/messages`,
      params as Record<string, string | number | undefined>,
    );
  },

  sendMessage(id: string, body: SendMessageInput) {
    return apiClient.post<ChatMessage>(`/admin/chat/conversations/${id}/messages`, body);
  },

  assignConversation(id: string, agentId: string) {
    return apiClient.patch<AdminConversation>(`/admin/chat/conversations/${id}/assign`, { agentId });
  },

  closeConversation(id: string, body: CloseConversationInput = {}) {
    return apiClient.patch<AdminConversation>(`/admin/chat/conversations/${id}/close`, body);
  },

  markRead(id: string) {
    return apiClient.patch<AdminConversation>(`/admin/chat/conversations/${id}/read`);
  },

  // === Scenarios ===

  listScenarios(params?: { type?: ScenarioTriggerType | 'all'; active?: boolean; search?: string }) {
    const q: Record<string, string | boolean | undefined> = {
      type: params?.type && params.type !== 'all' ? params.type : undefined,
      active: params?.active,
      search: params?.search,
    };
    return apiClient.get<ApiResponse<ChatScenario[]>>('/admin/chat/scenarios', q);
  },

  getScenario(id: string) {
    return apiClient.get<ChatScenario>(`/admin/chat/scenarios/${id}`);
  },

  createScenario(body: CreateScenarioInput) {
    return apiClient.post<ChatScenario>('/admin/chat/scenarios', body);
  },

  updateScenario(id: string, body: UpdateScenarioInput) {
    return apiClient.patch<ChatScenario>(`/admin/chat/scenarios/${id}`, body);
  },

  deleteScenario(id: string) {
    return apiClient.delete<void>(`/admin/chat/scenarios/${id}`);
  },

  // === Schedules ===

  listSchedules(params?: { active?: boolean }) {
    return apiClient.get<ApiResponse<ChatSchedule[]>>(
      '/admin/chat/schedules',
      params as Record<string, boolean | undefined>,
    );
  },

  getSchedule(id: string) {
    return apiClient.get<ChatSchedule>(`/admin/chat/schedules/${id}`);
  },

  createSchedule(body: CreateScheduleInput) {
    return apiClient.post<ChatSchedule>('/admin/chat/schedules', body);
  },

  updateSchedule(id: string, body: UpdateScheduleInput) {
    return apiClient.patch<ChatSchedule>(`/admin/chat/schedules/${id}`, body);
  },

  deleteSchedule(id: string) {
    return apiClient.delete<void>(`/admin/chat/schedules/${id}`);
  },
};

export default adminChatApi;
