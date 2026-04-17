import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Locale — ngon ngu duoc ho tro trong he thong.
 */
@Entity('locales')
export class Locale extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 10, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  native_name: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;
}
