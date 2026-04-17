import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Tenant — dai dien 1 to chuc/cua hang trong he thong multi-tenant.
 * Moi tenant co slug rieng, domain tuy chon, va settings rieng.
 */
@Entity('tenants')
@Index(['owner_id', 'is_active'])
export class Tenant extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 220, unique: true })
  slug: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  domain: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string | null;

  @Column({ type: 'json', nullable: true })
  settings: Record<string, any> | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Index()
  @Column({ type: 'varchar', length: 26, nullable: true })
  plan_id: string | null;

  @Index()
  @Column({ type: 'varchar', length: 26 })
  owner_id: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;
}
