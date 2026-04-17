import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { ScheduleMode } from '../chat.constants.js';

/**
 * Lich lam viec cua chat — quyet dinh mode (AI/HUMAN/HYBRID/OFFLINE)
 * dua tren gio va ngay trong tuan. Record co priority cao hon se thang.
 */
@Entity('chat_schedules')
export class ChatSchedule extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  // dayOfWeek 0=Sunday..6=Saturday. null = ap dung hang ngay
  @Column({ type: 'int', nullable: true })
  dayOfWeek: number | null;

  // "HH:mm" format — vi du "08:30"
  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  @Column({ type: 'varchar', length: 5 })
  endTime: string;

  @Column({
    type: 'enum',
    enum: ScheduleMode,
  })
  mode: ScheduleMode;

  @Column({ type: 'varchar', length: 50, default: 'Asia/Ho_Chi_Minh' })
  timezone: string;

  // Priority cao hon se duoc chon neu co nhieu rule cung khop
  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Thong diep gui khi mode la OFFLINE
  @Column({ type: 'text', nullable: true })
  fallbackMessage: string | null;
}
