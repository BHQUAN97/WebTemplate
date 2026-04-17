import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * ApiKey — key xac thuc API cho tenant.
 * Luu hash SHA256, chi tra ve full key 1 lan khi tao.
 */
@Entity('api_keys')
@Index(['tenant_id', 'is_active'])
export class ApiKey extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 26 })
  tenant_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 8 })
  key_prefix: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  key_hash: string;

  @Column({ type: 'json' })
  scopes: string[];

  @Column({ type: 'int', default: 1000 })
  rate_limit: number;

  @Column({ type: 'timestamp', nullable: true })
  last_used_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
