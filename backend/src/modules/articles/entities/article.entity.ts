import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { ArticleStatus } from '../../../common/constants/index.js';

/**
 * Bai viet — luu noi dung Tiptap JSON, SEO, tags, trang thai xuat ban.
 */
@Entity('articles')
@Index(['tenant_id', 'status'])
@Index(['tenant_id', 'published_at'])
export class Article extends BaseEntity {
  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 320, unique: true })
  slug: string;

  @Column({ type: 'longtext' })
  content: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  excerpt: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  featured_image: string | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  category_id: string | null;

  @Index()
  @Column({ type: 'char', length: 26 })
  author_id: string;

  @Column({
    type: 'enum',
    enum: ArticleStatus,
    default: ArticleStatus.DRAFT,
  })
  status: ArticleStatus;

  @Column({ type: 'json', nullable: true })
  tags: string[] | null;

  @Column({ type: 'boolean', default: false })
  is_featured: boolean;

  @Column({ type: 'timestamp', nullable: true })
  published_at: Date | null;

  @Column({ type: 'int', default: 0 })
  view_count: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  seo_title: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  seo_description: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  seo_keywords: string | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  tenant_id: string | null;
}
