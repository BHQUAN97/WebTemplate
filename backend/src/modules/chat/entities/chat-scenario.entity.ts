import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { MessageType, ScenarioTrigger } from '../chat.constants.js';

/**
 * Dieu kien phu them de match scenario — vi du chi fire khi la lan dau
 * khach nhan tin, khi co san pham trong gio, hoac sau X ngay khong mua.
 */
export interface ScenarioConditions {
  isFirstMessage?: boolean;
  hasCartItems?: boolean;
  minDaysSinceLastOrder?: number;
  [key: string]: any;
}

/**
 * Kich ban chat (scenario) — template tra loi tu dong khi trigger khop.
 * Ho tro keyword, intent (AI classify), event (system trigger), scheduled cron.
 */
@Entity('chat_scenarios')
export class ChatScenario extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: ScenarioTrigger,
  })
  triggerType: ScenarioTrigger;

  // Keyword string, intent name, event name, hoac cron expression tuy triggerType
  @Column({ type: 'varchar', length: 500 })
  triggerValue: string;

  @Column({ type: 'json', nullable: true })
  conditions: ScenarioConditions | null;

  // Template string — support `{{customerName}}`, `{{productName}}` placeholders
  @Column({ type: 'text' })
  response: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  responseType: MessageType;

  // Chain scenarios — sau khi response se trigger scenario khac
  @Column({ type: 'char', length: 26, nullable: true })
  followUpScenarioId: string | null;

  // Delay truoc khi gui response — mo phong typing tu nhien
  @Column({ type: 'int', default: 0 })
  delayMinutes: number;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Stats — moi lan match tang 1, dung cho analytics
  @Column({ type: 'int', default: 0 })
  matchCount: number;
}
