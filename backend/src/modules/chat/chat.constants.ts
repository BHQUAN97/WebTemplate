/**
 * Chat module constants — enums cho conversation, message, channel, schedule.
 * Dung chung giua entities, services, controllers, gateway.
 */

/**
 * Trang thai hoi thoai — vong doi cua 1 conversation.
 */
export enum ConversationStatus {
  OPEN = 'open',
  WAITING_AGENT = 'waiting_agent',
  WITH_AGENT = 'with_agent',
  WITH_AI = 'with_ai',
  CLOSED = 'closed',
}

/**
 * Vai tro cua sender trong message.
 */
export enum MessageRole {
  USER = 'user',
  AI = 'ai',
  AGENT = 'agent',
  SYSTEM = 'system',
}

/**
 * Loai noi dung message — text, image, hoac card co cau truc.
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  PRODUCT_CARD = 'product_card',
  ORDER_CARD = 'order_card',
  QUICK_REPLIES = 'quick_replies',
  SYSTEM_EVENT = 'system_event',
}

/**
 * Kenh khach hang nhan tin — web widget, mobile app, social.
 */
export enum ChannelType {
  WEB = 'web',
  MOBILE = 'mobile',
  ZALO = 'zalo',
  FACEBOOK = 'facebook',
}

/**
 * Che do xu ly chat — AI tu tra loi, nguoi that, hybrid, hoac offline.
 */
export enum ScheduleMode {
  AI = 'ai',
  HUMAN = 'human',
  HYBRID = 'hybrid',
  OFFLINE = 'offline',
}

/**
 * Kieu trigger cua scenario — tu dong khoi dong khi match.
 */
export enum ScenarioTrigger {
  KEYWORD = 'keyword',
  INTENT = 'intent',
  EVENT = 'event',
  SCHEDULED = 'scheduled',
}

/**
 * Event names phat qua WebSocket — dung chung cho client/server.
 */
export const CHAT_EVENTS = {
  MESSAGE_NEW: 'chat:message',
  TYPING: 'chat:typing',
  CONVERSATION_UPDATED: 'chat:conversation-updated',
  AGENT_ASSIGNED: 'chat:agent-assigned',
} as const;
