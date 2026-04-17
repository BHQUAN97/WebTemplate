import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserRole } from '../../common/constants/index.js';
import { hashPassword } from '../../common/utils/hash.js';

/**
 * Users service — quan ly nguoi dung, extends BaseService de co san CRUD + pagination.
 */
@Injectable()
export class UsersService extends BaseService<User> {
  protected searchableFields = ['email', 'name'];

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    super(usersRepository, 'User');
  }

  /**
   * Tim user theo email — dung cho auth login/register.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  /**
   * Tao user moi — hash password truoc khi luu.
   */
  async createUser(dto: CreateUserDto): Promise<User> {
    const passwordHash = await hashPassword(dto.password);
    return this.create({
      email: dto.email,
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
   * Override applyFilters de ho tro search theo email/name.
   * BaseService da xu ly search tren searchableFields, day la hook cho custom filters.
   */
  protected applyFilters(
    _qb: SelectQueryBuilder<User>,
    _options: PaginationDto,
  ): void {
    // BaseService da handle search qua searchableFields
    // Them custom filters o day neu can
  }
}
