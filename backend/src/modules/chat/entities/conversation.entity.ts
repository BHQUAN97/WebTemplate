import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import {
  ChannelType,
  ConversationStatus,
  ScheduleMode,
} from '../chat.constants.js';
import { ChatMessage } from './chat-message.entity.js';

/**
 * Attachment meta luu trong metadata JSON — ip, user agent, page URL, cartId...
 */
export interface ConversationMetadata {
  ip?: string;
  userAgent?: string;
  pageUrl?: string;
  cartId?: string;
  [key: string]: any;
}

/**
 * Hoi thoai (conversation) — 1 phien chat giua khach va AI/agent.
 * Mot khach co the co nhieu conversation qua thoi gian.
 */
@Entity('conversations')
@Index(['status', 'lastMessageAt'])
export class Conversation extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ChannelType,
    default: ChannelType.WEB,
  })
  channel: ChannelType;

  @Index()
  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.OPEN,
  })
  status: ConversationStatus;

  @Column({
    type: 'enum',
    enum: ScheduleMode,
    default: ScheduleMode.AI,
  })
  mode: ScheduleMode;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject: string | null;

  // Customer info — khach co the la guest (no userId) hoac registered user
  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  customerId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customerName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerEmail: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customerPhone: string | null;

  // Agent assigned — ULID cua staff user neu da duoc chuyen cho nguoi that
  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  agentId: string | null;

  @Index()
  @Column({ type: 'datetime', nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: 'text', nullable: true })
  lastMessagePreview: string | null;

  // Counters — reset khi ben tuong ung read
  @Column({ type: 'int', default: 0 })
  unreadByAgent: number;

  @Column({ type: 'int', default: 0 })
  unreadByCustomer: number;

  // Metadata — ip, userAgent, pageUrl, cartId, etc.
  @Column({ type: 'json', nullable: true })
  metadata: ConversationMetadata | null;

  // Tags — CSV string luu qua simple-array cho phep filter theo tag
  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  // Rating 1-5 do khach danh gia sau khi close
  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  // Relation: tat ca message thuoc conversation nay
  @OneToMany(() => ChatMessage, (message) => message.conversation)
  messages: ChatMessage[];
}
