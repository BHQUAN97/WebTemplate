import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Feature flag — bat/tat tinh nang moi runtime khong can deploy.
 * Ho tro rollout % va target theo role.
 *
 * Vi du:
 *  - key='new_checkout', enabled=true, rollout_percentage=50 -> 50% users
 *  - key='beta_admin_ui', enabled=true, target_roles=['admin'] -> chi admin thay
 */
@Entity('feature_flags')
export class FeatureFlag extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** 0-100. Neu <100, hash userId de quyet dinh user co thay khong */
  @Column({ type: 'int', default: 100, name: 'rollout_percentage' })
  rollout_percentage: number;

  /**
   * Chi apply cho cac role trong list.
   * `simple-array` — TypeORM luu duoi dang CSV string.
   * null = khong gioi han role.
   */
  @Column({ type: 'simple-array', nullable: true, name: 'target_roles' })
  target_roles: string[] | null;
}
