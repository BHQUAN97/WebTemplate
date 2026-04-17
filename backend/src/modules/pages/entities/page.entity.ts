import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Trang tinh — page builder config (JSON), ho tro cay phan cap, SEO.
 */
@Entity('pages')
@Index(['tenant_id', 'status'])
export class Page extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 220, unique: true })
  slug: string;

  @Column({ type: 'longtext' })
  content: string;

  @Column({ type: 'varchar', length: 50, default: 'default' })
  template: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'published'],
    default: 'draft',
  })
  status: 'draft' | 'published';

  @Column({ type: 'boolean', default: false })
  is_homepage: boolean;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  parent_id: string | null;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  seo_title: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  seo_description: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  tenant_id: string | null;

  @ManyToOne(() => Page, (page) => page.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Page | null;

  @OneToMany(() => Page, (page) => page.parent)
  children: Page[];
}
