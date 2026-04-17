import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * FAQ — cau hoi thuong gap, sap xep theo danh muc va thu tu.
 */
@Entity('faqs')
@Index(['tenant_id', 'is_active'])
@Index(['category_id', 'sort_order'])
export class Faq extends BaseEntity {
  @Column({ type: 'varchar', length: 500 })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  category_id: string | null;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  view_count: number;

  @Column({ type: 'int', default: 0 })
  helpful_count: number;

  @Column({ type: 'int', default: 0 })
  not_helpful_count: number;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  tenant_id: string | null;
}
