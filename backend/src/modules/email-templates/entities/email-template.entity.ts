import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * EmailTemplate — mau email Handlebars co the tuy chinh theo tenant.
 * Cac template mac dinh (welcome, order_confirmation...) duoc seed khi khoi tao.
 */
@Entity('email_templates')
@Index(['tenant_id', 'name'])
export class EmailTemplate extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'longtext' })
  html_body: string;

  @Column({ type: 'text', nullable: true })
  text_body: string | null;

  @Column({ type: 'json', nullable: true })
  variables: string[] | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Index()
  @Column({ type: 'varchar', length: 26, nullable: true })
  tenant_id: string | null;
}
