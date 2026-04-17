import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Luu tru thong tin file media (anh, video, tai lieu...).
 * File thuc te luu tren S3/R2, entity chi luu metadata.
 */
@Entity('media')
@Index(['uploaded_by', 'created_at'])
@Index(['folder', 'mime_type'])
export class Media extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 255 })
  original_name: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ type: 'varchar', length: 500, unique: true })
  storage_key: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail_url: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  alt_text: string | null;

  @Index()
  @Column({ type: 'varchar', length: 200, default: '/' })
  folder: string;

  @Column({ type: 'int', nullable: true })
  width: number | null;

  @Column({ type: 'int', nullable: true })
  height: number | null;

  @Index()
  @Column({ type: 'varchar', length: 26 })
  uploaded_by: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;
}
