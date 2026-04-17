import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Enum for setting value types.
 */
export enum SettingType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
}

/**
 * Cau hinh he thong dang key-value.
 * Luu tru cac thiet lap nhu site_name, currency, timezone...
 */
@Entity('settings')
export class Setting extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'enum', enum: SettingType, default: SettingType.STRING })
  type: SettingType;

  @Index()
  @Column({ type: 'varchar', length: 50, default: 'general' })
  group: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  is_public: boolean;
}
