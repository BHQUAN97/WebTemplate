import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { Media } from '../../modules/media/entities/media.entity.js';
import { QUEUE_NAMES } from './queue.module.js';
import { DeadLetterService } from './dead-letter.service.js';

/**
 * Job generate thumbnail — resize anh thanh cac kich thuoc pho bien.
 */
export interface ThumbnailJobData {
  mediaId: string;
  sizes?: number[]; // default [200, 600, 1200]
}

/**
 * MediaProcessor — xu ly background cho media:
 *  - Generate thumbnails (resize qua sharp + upload S3).
 *  - Co the mo rong them (transcode video, OCR anh...).
 */
@Processor(QUEUE_NAMES.MEDIA)
export class MediaProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaProcessor.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    private readonly dlqService: DeadLetterService,
  ) {
    super();
    this.bucket = this.configService.get<string>('storage.bucket', '');
    this.publicUrl = this.configService.get<string>('storage.publicUrl', '');

    const endpoint = this.configService.get<string>('storage.endpoint', '');
    const region = this.configService.get<string>('storage.region', 'auto');
    const accessKey = this.configService.get<string>('storage.accessKey', '');
    const secretKey = this.configService.get<string>('storage.secretKey', '');
    const forcePathStyle =
      (process.env.S3_FORCE_PATH_STYLE || 'true').toLowerCase() === 'true';

    this.s3 = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle,
      credentials:
        accessKey && secretKey
          ? { accessKeyId: accessKey, secretAccessKey: secretKey }
          : undefined,
    });
  }

  /**
   * Failed listener -> DLQ khi vuot max attempts.
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<ThumbnailJobData>, err: Error): Promise<void> {
    const maxAttempts = job.opts?.attempts ?? 3;
    if ((job.attemptsMade ?? 0) >= maxAttempts) {
      try {
        await this.dlqService.moveToDlq({
          originalQueue: QUEUE_NAMES.MEDIA,
          originalJobName: job.name,
          originalJobId: job.id,
          payload: job.data,
          error: err?.message || String(err),
          attemptsMade: job.attemptsMade ?? 0,
          failedAt: new Date().toISOString(),
        });
      } catch (dlqErr) {
        this.logger.error(
          `Failed to move media job to DLQ: ${(dlqErr as Error).message}`,
        );
      }
    }
  }

  /**
   * Dispatch theo job name.
   */
  async process(job: Job<ThumbnailJobData>): Promise<{ thumbnailUrl?: string }> {
    switch (job.name) {
      case 'thumbnail':
        return this.handleThumbnail(job.data);
      default:
        this.logger.warn(`Unknown media job: ${job.name}`);
        return {};
    }
  }

  /**
   * Generate thumbnails cho 1 media — chi xu ly neu la anh.
   * Thumbnail dau tien (size nho nhat) se duoc set vao media.thumbnail_url.
   */
  private async handleThumbnail(
    data: ThumbnailJobData,
  ): Promise<{ thumbnailUrl?: string }> {
    const sizes = data.sizes && data.sizes.length > 0
      ? data.sizes
      : [200, 600, 1200];

    const media = await this.mediaRepo.findOne({ where: { id: data.mediaId } });
    if (!media) {
      this.logger.warn(`Media ${data.mediaId} not found, skip thumbnail`);
      return {};
    }
    if (!media.mime_type.startsWith('image/')) {
      return {};
    }

    // Download anh goc tu S3
    const getCmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: media.storage_key,
    });
    const obj = await this.s3.send(getCmd);
    const sourceBuffer = Buffer.from(
      await (obj.Body as any).transformToByteArray(),
    );

    let firstUrl: string | undefined;

    for (const size of sizes) {
      const resized = await sharp(sourceBuffer)
        .rotate()
        .resize(size, size, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      const thumbKey = this.buildThumbKey(media.storage_key, size);
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: thumbKey,
          Body: resized,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      const url = this.buildPublicUrl(thumbKey);
      if (!firstUrl) firstUrl = url;
      this.logger.log(`Thumbnail ${size}px uploaded: ${thumbKey}`);
    }

    // Cap nhat thumbnail_url = anh nho nhat (dung cho listing)
    if (firstUrl) {
      media.thumbnail_url = firstUrl;
      await this.mediaRepo.save(media);
    }
    return { thumbnailUrl: firstUrl };
  }

  /**
   * Build key thumbnail: folder/name.ext -> folder/name-thumb-{size}.webp
   */
  private buildThumbKey(originalKey: string, size: number): string {
    const dot = originalKey.lastIndexOf('.');
    const base = dot > 0 ? originalKey.slice(0, dot) : originalKey;
    return `${base}-thumb-${size}.webp`;
  }

  /**
   * Build public URL cho 1 key.
   */
  private buildPublicUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
    }
    return `/uploads/${key}`;
  }
}
