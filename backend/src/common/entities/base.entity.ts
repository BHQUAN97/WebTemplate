import {
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { generateUlid } from '../utils/ulid.js';

/**
 * Base entity that all domain entities extend.
 * Provides ULID primary key, timestamps, and soft delete support.
 *
 * @example
 * ```ts
 * @Entity('users')
 * export class UserEntity extends BaseEntity {
 *   @Column()
 *   name: string;
 * }
 * ```
 */
export abstract class BaseEntity {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at: Date;

  // Index deleted_at de toi uu soft-delete filter (WHERE deleted_at IS NULL)
  // — moi findAll qua BaseService deu co dieu kien nay.
  @Index()
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = generateUlid();
    }
  }
}
