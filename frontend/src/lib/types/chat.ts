// ============================================================
// Chat types — shared giua customer widget, admin console va API.
// ============================================================

export type ChatRole = 'user' | 'ai' | 'agent' | 'system';

export type ChatMessageType =
  | 'text'
  | 'product_card'
  | 'order_card'
  | 'quick_replies'
  | 'system_event';

export type ChatMode = 'ai' | 'human' | 'hybrid' | 'offline';

export type ChatChannel = 'web' | 'zalo' | 'messenger' | 'email';

export interface ChatProductCard {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  url?: string | null;
}

export interface ChatOrderCard {
  id: string;
  code: string;
  status: string;
  total: number;
  createdAt: string;
}

export interface ChatQuickReply {
  label: string;
  payload: string;
}

export interface ChatMessageMetadata {
  product?: ChatProductCard;
  order?: ChatOrderCard;
  quickReplies?: ChatQuickReply[];
  systemEvent?: string;
  [k: string]: unknown;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  type: ChatMessageType;
  content: string;
  metadata?: ChatMessageMetadata | null;
  sender?: {
    id?: string;
    name?: string;
    avatarUrl?: string | null;
  } | null;
  createdAt: string;
}

export interface ChatAgent {
  id?: string;
  name?: string;
  avatarUrl?: string | null;
}

export interface ChatConversation {
  id: string;
  channel: ChatChannel;
  mode: ChatMode;
  customerSessionId?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  agent?: ChatAgent | null;
  createdAt: string;
  updatedAt: string;
}

export interface StartChatInput {
  channel?: ChatChannel;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  initialMessage?: string;
}

export interface StartChatResponse extends ChatConversation {
  customerSessionId: string;
  messages?: ChatMessage[];
}

export interface GetMessagesParams {
  before?: string;
  limit?: number;
}
