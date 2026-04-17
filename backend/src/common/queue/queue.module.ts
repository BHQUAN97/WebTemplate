import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

/**
 * Ten cac queue duoc su dung trong he thong.
 * Tat ca module khac khi can dispatch job phai dung cac ten nay.
 */
export const QUEUE_NAMES = {
  EMAIL: 'email',
  WEBHOOK: 'webhook',
  MEDIA: 'media-processing',
} as const;

/**
 * Default job options: 3 attempts + exponential backoff + auto-cleanup.
 */
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 60_000, // 1 phut cho lan retry dau
  },
  removeOnComplete: { count: 500, age: 24 * 3600 },
  removeOnFail: { count: 1000, age: 7 * 24 * 3600 },
};

/**
 * QueueModule — register tat ca queue de cac module khac co the inject.
 * Marked @Global de tranh phai import lai o moi module.
 */
@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL, defaultJobOptions: DEFAULT_JOB_OPTIONS },
      { name: QUEUE_NAMES.WEBHOOK, defaultJobOptions: DEFAULT_JOB_OPTIONS },
      { name: QUEUE_NAMES.MEDIA, defaultJobOptions: DEFAULT_JOB_OPTIONS },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
