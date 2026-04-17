import { Entity, Column, Unique, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Translation — ban dich cho 1 key trong 1 locale va namespace.
 * Ho tro multi-tenant: tenant_id nullable cho ban dich tuy chinh.
 */
@Entity('translations')
@Unique(['locale', 'namespace', 'key', 'tenant_id'])
@Index(['locale', 'namespace'])
export class Translation extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 10 })
  locale: string;

  @Column({ type: 'varchar', length: 50 })
  namespace: string;

  @Column({ type: 'varchar', length: 200 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Index()
  @Column({ type: 'varchar', length: 26, nullable: true })
  tenant_id: string | null;
}
