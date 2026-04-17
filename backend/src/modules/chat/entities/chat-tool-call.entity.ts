import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Audit log cho moi tool call cua AI — ghi lai ai (actor), lam gi (tool + args),
 * ket qua (ok/denied/error), thoi gian, de sau nay audit + detect abuse.
 */
export type ChatToolCallResult = 'ok' | 'denied' | 'error' | 'rate_limited';

@Entity('chat_tool_calls')
@Index(['conversationId', 'created_at'])
@Index(['toolName', 'created_at'])
@Index(['result', 'created_at'])
export class ChatToolCall extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  conversationId: string;

  @Column({ type: 'varchar', length: 80 })
  toolName: string;

  /** JSON-stringified args, truncated to 2KB. */
  @Column({ type: 'text', nullable: true })
  args: string | null;

  @Column({ type: 'varchar', length: 20 })
  result: ChatToolCallResult;

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage: string | null;

  @Column({ type: 'int', default: 0 })
  durationMs: number;

  @Column({ type: 'varchar', length: 20 })
  actorType: string;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  customerId: string | null;

}
