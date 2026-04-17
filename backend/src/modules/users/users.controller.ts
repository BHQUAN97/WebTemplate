import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UsersService } from './users.service.js';
import { GdprExportService } from './gdpr-export.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import { paginatedResponse } from '../../common/utils/response.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly gdprExportService: GdprExportService,
  ) {}

  /**
   * GET /users/:id/export — GDPR data export.
   * Allow: admin HOAC chinh user. Tra ZIP stream.
   * Rate-limit: 1 request/user/day (check trong service).
   */
  @Get(':id/export')
  async gdprExport(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Res() res: Response,
  ) {
    const isAdmin = currentUser.role === UserRole.ADMIN;
    if (!isAdmin && currentUser.id !== id) {
      throw new ForbiddenException('You can only export your own data');
    }

    const stream = await this.gdprExportService.exportUserDataZipStream(id);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="user-data-${id}-${ts}.zip"`,
      'Cache-Control': 'no-store',
    });
    stream.pipe(res);
  }

  /**
   * GET /users — danh sach users (admin only), co pagination + search.
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findAll(@Query() query: PaginationDto) {
    const { items, meta } = await this.usersService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * GET /users/me — lay profile cua user dang dang nhap.
   */
  @Get('me')
  async getMyProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  /**
   * PATCH /users/me — user tu cap nhat profile.
   */
  @Patch('me')
  async updateMyProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  /**
   * GET /users/:id — xem chi tiet user (admin).
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  /**
   * POST /users — admin tao user moi.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  /**
   * PATCH /users/:id — admin cap nhat user.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto as any);
  }

  /**
   * DELETE /users/:id — admin soft delete user.
   * Reject neu admin co gang xoa chinh minh — tranh lock out accidentally.
   * softDelete() cung revoke tat ca refresh tokens cua user qua override.
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() currentUser: ICurrentUser) {
    if (id === currentUser.id) {
      throw new BadRequestException('Cannot delete yourself');
    }
    await this.usersService.softDelete(id);
    return { message: 'User deleted successfully' };
  }
}
