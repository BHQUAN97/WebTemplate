import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { generateUlid } from '../../../common/utils/ulid.js';

/**
 * Enum loai thay doi trong changelog.
 */
export enum ChangelogType {
  FEATURE = 'feature',
  FIX = 'fix',
  IMPROVEMENT = 'improvement',
  BREAKING = 'breaking',
}

/**
 * Ghi lai lich su thay doi phien ban cua ung dung.
 * Dung de theo doi database/app upgrade history.
 */
@Entity('changelogs')
@Index(['version', 'type'])
export class Changelog {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  version: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: ChangelogType })
  type: ChangelogType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  module: string | null;

  @Column({ type: 'varchar', length: 26, nullable: true })
  created_by: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = generateUlid();
    }
  }
}
