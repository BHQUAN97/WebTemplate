import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { ContactStatus } from '../../../common/constants/index.js';

/**
 * Lien he — form lien he tu khach hang, tracking trang thai xu ly.
 */
@Entity('contacts')
@Index(['tenant_id', 'status'])
@Index(['status', 'created_at'])
export class Contact extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.NEW,
  })
  status: ContactStatus;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  assigned_to: string | null;

  @Column({ type: 'text', nullable: true })
  admin_notes: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  tenant_id: string | null;
}
