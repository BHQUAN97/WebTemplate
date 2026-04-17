import { Entity, Column, Index, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { UserRole } from '../../../common/constants/index.js';
import { RefreshToken } from '../../auth/entities/refresh-token.entity.js';

/**
 * User entity — luu thong tin tai khoan nguoi dung.
 * Ho tro multi-tenant qua tenant_id, 2FA qua two_factor fields.
 *
 * Sensitive fields (password_hash, two_factor_secret, reset_token_jti) duoc
 * danh dau @Exclude de ClassSerializerInterceptor tu dong loai bo khoi response.
 */
@Entity('users')
@Index(['tenant_id'])
@Index(['role'])
@Index(['deleted_at'])
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar_url: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_email_verified: boolean;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  two_factor_secret: string | null;

  @Column({ type: 'boolean', default: false })
  two_factor_enabled: boolean;

  /**
   * JTI cua reset password token con hieu luc. Dat null sau khi dung
   * hoac khi tao token moi — dam bao token chi dung duoc 1 lan.
   */
  @Exclude()
  @Column({ type: 'varchar', length: 64, nullable: true })
  reset_token_jti: string | null;

  @Column({ type: 'timestamp', nullable: true })
  last_login_at: Date | null;

  @Column({ type: 'char', length: 26, nullable: true })
  tenant_id: string | null;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];
}
