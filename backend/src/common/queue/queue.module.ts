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
  ANALYTICS: 'analytics',
} as const;

/**
 * Default job options: backoff exponential + auto-cleanup.
 * - attempts: KHAC NHAU theo queue, override duoi
 * - removeOnComplete: giu 500 job moi nhat / 24h
 * - removeOnFail: giu 1000 job fail moi nhat / 7d (debug)
 */
const BASE_JOB_OPTIONS = {
  backoff: {
    type: 'exponential' as const,
    delay: 60_000, // 1 phut cho lan retry dau
  },
  removeOnComplete: { count: 500, age: 24 * 3600 },
  removeOnFail: { count: 1000, age: 7 * 24 * 3600 },
};

/**
 * Email: 3 attempts, fail nhanh — tranh spam queue (Resend co rate limit).
 */
const EMAIL_JOB_OPTIONS = {
  ...BASE_JOB_OPTIONS,
  attempts: 3,
};

/**
 * Webhook: 5 attempts — match voi MAX_WEBHOOK_ATTEMPTS trong webhook-retry.cron.
 */
const WEBHOOK_JOB_OPTIONS = {
  ...BASE_JOB_OPTIONS,
  attempts: 5,
};

/**
 * Media: 3 attempts (image processing).
 */
const MEDIA_JOB_OPTIONS = {
  ...BASE_JOB_OPTIONS,
  attempts: 3,
};

/**
 * Analytics: 2 attempts — fire-and-forget tracking, mat 1-2 record khong nghiem trong.
 * removeOnComplete giu it & nhanh (1000 jobs / 1h) de tranh phinh Redis voi
 * volume cao (1000+ req/s). removeOnFail giu 500 / 24h de debug.
 */
const ANALYTICS_JOB_OPTIONS = {
  ...BASE_JOB_OPTIONS,
  attempts: 2,
  removeOnComplete: { count: 1000, age: 3600 },
  removeOnFail: { count: 500, age: 24 * 3600 },
};

/**
 * QueueModule — register tat ca queue de cac module khac co the inject.
 * Marked @Global de tranh phai import lai o moi module.
 *
 * Note: BullMQ KHONG support `timeout` field trong DEFAULT job options;
 * timeout phai duoc xu ly trong processor (vd Promise.race voi setTimeout)
 * hoac qua AbortSignal khi goi external HTTP.
 */
@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL, defaultJobOptions: EMAIL_JOB_OPTIONS },
      { name: QUEUE_NAMES.WEBHOOK, defaultJobOptions: WEBHOOK_JOB_OPTIONS },
      { name: QUEUE_NAMES.MEDIA, defaultJobOptions: MEDIA_JOB_OPTIONS },
      { name: QUEUE_NAMES.ANALYTICS, defaultJobOptions: ANALYTICS_JOB_OPTIONS },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
