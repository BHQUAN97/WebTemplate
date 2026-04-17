import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { generateUlid } from '../../../common/utils/ulid.js';
import { User } from '../../users/entities/user.entity.js';

/**
 * Refresh token entity — luu token hash (SHA256), thong tin thiet bi, trang thai revoke.
 * Moi user co the co nhieu refresh token (nhieu thiet bi).
 */
@Entity('refresh_tokens')
@Index(['token_hash'], { unique: true })
@Index(['user_id', 'is_revoked'])
@Index(['expires_at'])
export class RefreshToken {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'char', length: 26 })
  user_id: string;

  @Column({ type: 'varchar', length: 64 })
  token_hash: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string | null;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'boolean', default: false })
  is_revoked: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = generateUlid();
    }
  }
}
