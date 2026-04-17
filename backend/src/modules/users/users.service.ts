import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserRole } from '../../common/constants/index.js';
import { hashPassword } from '../../common/utils/hash.js';
import { AuthService } from '../auth/auth.service.js';

/**
 * Users service — quan ly nguoi dung, extends BaseService de co san CRUD + pagination.
 */
@Injectable()
export class UsersService extends BaseService<User> {
  protected searchableFields = ['email', 'name'];

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    // forwardRef tranh circular dep: AuthModule -> UsersModule -> AuthModule
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {
    super(usersRepository, 'User');
  }

  /**
   * Normalize email — chuan hoa de tranh case-sensitivity gay account takeover.
   * "User@Example.COM" → "user@example.com". Goi truoc moi find/save voi email.
   */
  static normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  /**
   * Tim user theo email — case-insensitive (normalize truoc khi query).
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: UsersService.normalizeEmail(email) },
    });
  }

  /**
   * Tao user moi — hash password + normalize email truoc khi luu.
   */
  async createUser(dto: CreateUserDto): Promise<User> {
    const passwordHash = await hashPassword(dto.password);
    return this.create({
      email: UsersService.normalizeEmail(dto.email),
      password_hash: passwordHash,
      name: dto.name,
      role: dto.role || UserRole.USER,
    });
  }

  /**
   * User tu cap nhat profile cua minh.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    return this.update(userId, dto as any);
  }

  /**
   * Admin doi role cua user.
   */
  async updateRole(userId: string, role: UserRole): Promise<User> {
    return this.update(userId, { role } as any);
  }

  /**
   * Kich hoat / vo hieu hoa tai khoan.
   */
  async toggleActive(userId: string): Promise<User> {
    const user = await this.findById(userId);
    return this.update(userId, { is_active: !user.is_active } as any);
  }

  /**
   * Override softDelete: sau khi mark deleted_at, revoke tat ca refresh token
   * cua user de session active bi invalidate ngay.
   * JwtStrategy cung se reject access token (vi deleted_at != null).
   */
  async softDelete(id: string): Promise<void> {
    await super.softDelete(id);
    await this.authService.revokeAllUserTokens(id);
  }

  /**
   * Override applyFilters de ho tro search theo email/name.
   */
  protected applyFilters(
    _qb: SelectQueryBuilder<User>,
    _options: PaginationDto,
  ): void {
    // BaseService da handle search qua searchableFields
  }
}
