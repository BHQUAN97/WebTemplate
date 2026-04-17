import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../entities/base.entity.js';

/**
 * Ten queue BullMQ cho dead letter. Dang ky trong QueueModule.
 */
export const DLQ_QUEUE_NAME = 'dead-letter';

/**
 * Payload ma cac processor (email/webhook/media) add vao DLQ khi job fail
 * vuot qua maxAttempts. Luu tru ca trong BullMQ va DB table de admin co the review.
 */
export interface DeadLetterJobData {
  /** Queue goc noi job fail (vd "email", "webhook"). */
  originalQueue: string;
  /** Ten job goc (vd "send", "deliver"). */
  originalJobName: string;
  /** ID job goc. */
  originalJobId?: string;
  /** Payload goc cua job de requeue sau nay. */
  payload: Record<string, any>;
  /** Loi cuoi cung. */
  error: string;
  /** So attempts da thu. */
  attemptsMade: number;
  /** Timestamp khi vao DLQ (ISO). */
  failedAt: string;
}

/**
 * Dead letter entity — 1 record cho moi job fail vinh vien.
 * Admin duyet qua GET /admin/dlq, requeue qua POST, purge qua DELETE.
 */
@Entity('dead_letters')
@Index(['original_queue', 'created_at'])
@Index(['status'])
export class DeadLetter extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  original_queue: string;

  @Column({ type: 'varchar', length: 100 })
  original_job_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  original_job_id: string | null;

  @Column({ type: 'json' })
  payload: Record<string, any>;

  @Column({ type: 'text' })
  error: string;

  @Column({ type: 'int', default: 0 })
  attempts_made: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'requeued', 'purged'],
    default: 'pending',
  })
  status: 'pending' | 'requeued' | 'purged';

  @Column({ type: 'timestamp', nullable: true })
  requeued_at: Date | null;
}
