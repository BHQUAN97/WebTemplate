import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  AnalyticsService,
  ANALYTICS_JOBS,
  TrackEventJobData,
  TrackPageViewJobData,
} from '../../modules/analytics/analytics.service.js';
import { QUEUE_NAMES } from './queue.module.js';

/**
 * Union type cho payload moi job analytics — discriminated qua job.name.
 */
type AnalyticsJobData = TrackPageViewJobData | TrackEventJobData;

/**
 * AnalyticsProcessor — worker xu ly track-page-view / track-event o background.
 *
 * Tach DB write ra khoi request thread giup:
 *  - Khong exhaust connection pool khi traffic cao (1000+ req/s)
 *  - Response API 202 nhanh — FE khong cho ghi DB
 *  - Co the buffer qua spike (Redis hold), worker drain dan
 *
 * Khong move sang DLQ — analytics la fire-and-forget; mat 1-2 record
 * khong nghiem trong nen chi log warn khi fail vinh vien.
 */
@Processor(QUEUE_NAMES.ANALYTICS)
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(private readonly analyticsService: AnalyticsService) {
    super();
  }

  /**
   * Khi job fail vinh vien (vuot 2 attempts) — chi log warn, khong DLQ.
   * Analytics khong critical: mat 1 page view / event trong spike la chap nhan.
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job<AnalyticsJobData>, err: Error): void {
    const maxAttempts = job.opts?.attempts ?? 2;
    if ((job.attemptsMade ?? 0) >= maxAttempts) {
      this.logger.warn(
        `Analytics job "${job.name}" exhausted (${job.attemptsMade}/${maxAttempts}): ${err?.message || err}`,
      );
    }
  }

  /**
   * Dispatch theo job.name -> goi internal method tren AnalyticsService.
   */
  async process(job: Job<AnalyticsJobData>): Promise<{ ok: true }> {
    switch (job.name) {
      case ANALYTICS_JOBS.TRACK_PAGE_VIEW:
        await this.analyticsService._persistPageView(
          job.data as TrackPageViewJobData,
        );
        return { ok: true };

      case ANALYTICS_JOBS.TRACK_EVENT:
        await this.analyticsService._persistEvent(
          job.data as TrackEventJobData,
        );
        return { ok: true };

      default:
        // Job name khong xac dinh — log + skip (khong throw de tranh retry vo nghia)
        this.logger.warn(`Unknown analytics job name: ${job.name}`);
        return { ok: true };
    }
  }
}
