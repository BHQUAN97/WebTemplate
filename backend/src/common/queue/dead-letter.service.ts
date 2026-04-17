import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DeadLetter, DeadLetterJobData } from './dead-letter.queue.js';
import { QUEUE_NAMES } from './queue.module.js';

/**
 * DeadLetterService — helper dung chung cho tat ca processor/cron de:
 *  - Add record khi job fail vinh vien (moveToDlq).
 *  - List / retry / purge cho admin.
 */
@Injectable()
export class DeadLetterService {
  private readonly logger = new Logger(DeadLetterService.name);

  constructor(
    @InjectRepository(DeadLetter)
    private readonly dlqRepo: Repository<DeadLetter>,
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WEBHOOK)
    private readonly webhookQueue: Queue,
    @InjectQueue(QUEUE_NAMES.MEDIA)
    private readonly mediaQueue: Queue,
  ) {}

  /**
   * Ghi 1 job fail vinh vien vao DLQ table.
   * Goi tu failed-listener cua processor.
   */
  async moveToDlq(data: DeadLetterJobData): Promise<DeadLetter> {
    const entity = this.dlqRepo.create({
      original_queue: data.originalQueue,
      original_job_name: data.originalJobName,
      original_job_id: data.originalJobId ?? null,
      payload: data.payload,
      error: data.error.slice(0, 5000), // tranh text qua dai
      attempts_made: data.attemptsMade,
      status: 'pending',
    });
    const saved = await this.dlqRepo.save(entity);
    this.logger.warn(
      `DLQ: queue="${data.originalQueue}" job="${data.originalJobName}" attempts=${data.attemptsMade} error=${data.error.slice(0, 200)}`,
    );
    return saved;
  }

  /**
   * List DLQ items co pagination (pending first).
   */
  async list(options: {
    page: number;
    limit: number;
    queue?: string;
    status?: 'pending' | 'requeued' | 'purged';
  }): Promise<{
    items: DeadLetter[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit, queue, status } = options;
    const qb = this.dlqRepo
      .createQueryBuilder('dl')
      .where('dl.deleted_at IS NULL');
    if (queue) qb.andWhere('dl.original_queue = :queue', { queue });
    if (status) qb.andWhere('dl.status = :status', { status });
    qb.orderBy('dl.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Requeue 1 DLQ item vao queue goc. Cap nhat status='requeued'.
   * Return jobId moi.
   */
  async retry(id: string): Promise<{ jobId: string | undefined }> {
    const entry = await this.dlqRepo.findOne({
      where: { id, deleted_at: null as any },
    });
    if (!entry) throw new NotFoundException('Dead letter not found');
    if (entry.status === 'requeued') {
      throw new NotFoundException('Already requeued');
    }

    const queue = this.resolveQueue(entry.original_queue);
    if (!queue) {
      throw new NotFoundException(
        `Unknown original queue: ${entry.original_queue}`,
      );
    }

    const job = await queue.add(entry.original_job_name, entry.payload);
    entry.status = 'requeued';
    entry.requeued_at = new Date();
    await this.dlqRepo.save(entry);

    this.logger.log(
      `DLQ requeued: id=${id} -> ${entry.original_queue}/${entry.original_job_name} jobId=${job.id}`,
    );
    return { jobId: job.id };
  }

  /**
   * Purge 1 DLQ item (soft delete + status='purged').
   */
  async purge(id: string): Promise<void> {
    const entry = await this.dlqRepo.findOne({
      where: { id, deleted_at: null as any },
    });
    if (!entry) throw new NotFoundException('Dead letter not found');
    entry.status = 'purged';
    await this.dlqRepo.save(entry);
    await this.dlqRepo.softRemove(entry);
  }

  /**
   * Resolve queue name -> Queue instance. Tra null neu unknown.
   */
  private resolveQueue(name: string): Queue | null {
    switch (name) {
      case QUEUE_NAMES.EMAIL:
        return this.emailQueue;
      case QUEUE_NAMES.WEBHOOK:
        return this.webhookQueue;
      case QUEUE_NAMES.MEDIA:
        return this.mediaQueue;
      default:
        return null;
    }
  }
}
