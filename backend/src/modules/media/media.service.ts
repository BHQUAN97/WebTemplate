import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, SelectQueryBuilder, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { ulid } from 'ulid';
import { extname } from 'path';
import { BaseService } from '../../common/services/base.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Media } from './entities/media.entity.js';
import { UploadMediaDto } from './dto/upload-media.dto.js';
import { QueryMediaDto } from './dto/query-media.dto.js';
import { QUEUE_NAMES } from '../../common/queue/queue.module.js';
import { ThumbnailJobData } from '../../common/queue/media.processor.js';

/** Bulk download limit: so item */
export const BULK_DOWNLOAD_MAX_ITEMS = 100;
/** Bulk download limit: tong size (bytes) — 100MB */
export const BULK_DOWNLOAD_MAX_BYTES = 100 * 1024 * 1024;

/** Max file size — 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Whitelist MIME types — KHONG cho SVG (XSS risk). */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
]);

/** Resize image neu width > max. */
const MAX_IMAGE_WIDTH = 4096;

/**
 * Quan ly upload, luu tru va truy xuat file media qua S3/R2 + Sharp processing.
 */
@Injectable()
export class MediaService extends BaseService<Media> {
  protected searchableFields = ['filename', 'original_name', 'alt_text'];

  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_NAMES.MEDIA)
    private readonly mediaQueue: Queue<ThumbnailJobData>,
  ) {
    super(mediaRepo, 'Media');

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
   * Hook them filter theo folder va mime_type.
   */
  protected applyFilters(
    qb: SelectQueryBuilder<Media>,
    options: PaginationDto,
  ): void {
    const opts = options as QueryMediaDto;
    if (opts.folder) {
      qb.andWhere('entity.folder = :folder', { folder: opts.folder });
    }
    if (opts.mime_type) {
      qb.andWhere('entity.mime_type LIKE :mime_type', {
        mime_type: `${opts.mime_type}%`,
      });
    }
  }

  /**
   * Upload file len S3 + luu metadata vao DB.
   * - Validate MIME + size
   * - Neu la image: strip EXIF, auto-rotate, resize neu qua to
   * - Dispatch job generate thumbnail (200/600/1200)
   */
  async upload(
    file: Express.Multer.File,
    userId: string,
    dto: UploadMediaDto,
  ): Promise<Media> {
    if (!file || !file.buffer) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File qua lon. Max ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      );
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `MIME type "${file.mimetype}" khong duoc phep`,
      );
    }

    let body: Buffer = file.buffer;
    let width: number | null = null;
    let height: number | null = null;

    // Neu la anh: strip EXIF + auto-orient (+ resize neu qua to)
    if (file.mimetype.startsWith('image/')) {
      const pipeline = sharp(file.buffer).rotate(); // auto-rotate theo EXIF, strip orientation
      const meta = await pipeline.metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;

      if (width && width > MAX_IMAGE_WIDTH) {
        body = await pipeline
          .resize(MAX_IMAGE_WIDTH, null, { withoutEnlargement: true })
          .toBuffer();
        const meta2 = await sharp(body).metadata();
        width = meta2.width ?? width;
        height = meta2.height ?? height;
      } else {
        body = await pipeline.toBuffer();
      }
    }

    const folder = dto.folder || '/';
    const storageKey = this.buildKey(folder, file.originalname);

    // Upload S3
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: body,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    const url = this.buildPublicUrl(storageKey);

    const media = await this.create({
      filename: this.extractFilename(storageKey),
      original_name: file.originalname,
      mime_type: file.mimetype,
      size: body.length,
      storage_key: storageKey,
      url,
      alt_text: dto.alt_text || null,
      folder,
      uploaded_by: userId,
      width,
      height,
    } as any);

    // Enqueue thumbnail generation (chi cho anh)
    if (file.mimetype.startsWith('image/')) {
      await this.mediaQueue.add(
        'thumbnail',
        { mediaId: media.id, sizes: [200, 600, 1200] },
        { jobId: `thumb:${media.id}` },
      );
    }

    this.logger.log(`Uploaded ${file.originalname} → ${storageKey}`);
    return media;
  }

  /**
   * Upload thumbnail truc tiep (sync) — resize 300x300, upload S3, tra URL.
   * Dung khi can thumbnail ngay (vd: avatar), khong qua queue.
   */
  async uploadThumbnail(file: Express.Multer.File): Promise<string> {
    if (!file?.buffer || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Thumbnail phai la file anh');
    }
    const resized = await sharp(file.buffer)
      .rotate()
      .resize(300, 300, { fit: 'cover' })
      .webp({ quality: 82 })
      .toBuffer();

    const thumbKey = `thumbnails/${ulid()}.webp`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: thumbKey,
        Body: resized,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return this.buildPublicUrl(thumbKey);
  }

  /**
   * Tao presigned GET URL (default het han 1h).
   * Nhan vao mediaId HOAC storage key truc tiep.
   */
  async getPresignedUrl(
    idOrKey: string,
    expiresIn = 3600,
  ): Promise<string> {
    let key = idOrKey;
    // Neu la ULID (26 ky tu) coi la mediaId va tra key tu DB
    if (/^[0-9A-HJKMNP-TV-Z]{26}$/.test(idOrKey)) {
      const media = await this.mediaRepo.findOne({ where: { id: idOrKey } });
      if (!media) throw new NotFoundException('Media not found');
      key = media.storage_key;
    }

    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, cmd, { expiresIn });
  }

  /**
   * Xoa file khoi S3 + soft delete DB record.
   */
  async deleteMedia(id: string): Promise<void> {
    const media = await this.findById(id);
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: media.storage_key,
        }),
      );
    } catch (err: any) {
      // Log nhung khong block — S3 co the da xoa roi
      this.logger.warn(
        `S3 delete failed for ${media.storage_key}: ${err.message}`,
      );
    }
    await this.softDelete(id);
    this.logger.log(`Deleted media: ${media.original_name} (${id})`);
  }

  /**
   * Lay danh sach media trong 1 folder.
   */
  async getByFolder(folder: string): Promise<Media[]> {
    return this.mediaRepo.find({
      where: { folder },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Tinh tong dung luong da dung cua 1 user (bytes).
   */
  async getTotalStorageUsed(userId: string): Promise<number> {
    const result = await this.mediaRepo
      .createQueryBuilder('media')
      .select('SUM(media.size)', 'total')
      .where('media.uploaded_by = :userId', { userId })
      .getRawOne();

    return Number(result?.total || 0);
  }

  /**
   * Lay danh sach cac folder duy nhat.
   */
  async getFolders(): Promise<string[]> {
    const result = await this.mediaRepo
      .createQueryBuilder('media')
      .select('DISTINCT media.folder', 'folder')
      .orderBy('media.folder', 'ASC')
      .getRawMany();

    return result.map((r) => r.folder);
  }

  /**
   * Lay danh sach media theo ID (dung cho bulk operation).
   * Tu dong loc deleted_at.
   */
  async findByIds(ids: string[]): Promise<Media[]> {
    if (!ids.length) return [];
    return this.mediaRepo.find({
      where: { id: In(ids), deleted_at: null as any },
    });
  }

  /**
   * Download file tu S3 ve Buffer — dung cho bulk ZIP hoac GDPR export.
   * Throw NotFoundException neu S3 khong co file.
   */
  async getObjectBuffer(storageKey: string): Promise<Buffer> {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });
    const resp = await this.s3.send(cmd);
    const body = resp.Body as any;
    if (!body) {
      throw new NotFoundException(`S3 object ${storageKey} not found`);
    }
    const bytes: Uint8Array = await body.transformToByteArray();
    return Buffer.from(bytes);
  }

  /**
   * Build storage key: folder/{ulid}-{sanitized-filename}.
   * Sanitize: chi giu chu, so, dau cham, gach duoi + gach ngang.
   */
  private buildKey(folder: string, originalName: string): string {
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    const prefix = cleanFolder ? `${cleanFolder}/` : '';
    const ext = extname(originalName).toLowerCase();
    const base = originalName
      .slice(0, originalName.length - ext.length)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    const safeName = base ? `${base}${ext}` : `file${ext}`;
    return `${prefix}${ulid()}-${safeName}`;
  }

  /**
   * Extract ten file tu storage key (khong co folder).
   */
  private extractFilename(key: string): string {
    const idx = key.lastIndexOf('/');
    return idx >= 0 ? key.slice(idx + 1) : key;
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
