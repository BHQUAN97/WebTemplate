import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { MessageRole, MessageType } from '../chat.constants.js';
import { Conversation } from './conversation.entity.js';

/**
 * Attachment metadata — file kem theo message (image, pdf, etc.).
 */
export interface ChatAttachment {
  url: string;
  mime: string;
  size: number;
  name: string;
}

/**
 * Metadata cua message — AI model info, tool calls, scenario source...
 */
export interface ChatMessageMetadata {
  aiModel?: string;
  tokens?: { prompt?: number; completion?: number; total?: number };
  toolCalls?: Array<{ name: string; args: Record<string, any>; result?: any }>;
  sourceScenarioId?: string;
  [key: string]: any;
}

/**
 * Mot message trong conversation — tu user, AI, agent, hoac system.
 */
@Entity('chat_messages')
@Index(['conversationId', 'created_at'])
export class ChatMessage extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  conversationId: string;

  @Column({
    type: 'enum',
    enum: MessageRole,
  })
  role: MessageRole;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  senderName: string | null;

  // Sender user id — ULID cua agent neu role=AGENT; null khi role=USER/AI/SYSTEM
  @Column({ type: 'char', length: 26, nullable: true })
  senderId: string | null;

  // Array of {url, mime, size, name}
  @Column({ type: 'json', nullable: true })
  attachments: ChatAttachment[] | null;

  @Column({ type: 'json', nullable: true })
  metadata: ChatMessageMetadata | null;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;

  // Relation: message thuoc ve conversation nao — cascade delete khi xoa conv
  @ManyToOne(() => Conversation, (conv) => conv.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;
}
