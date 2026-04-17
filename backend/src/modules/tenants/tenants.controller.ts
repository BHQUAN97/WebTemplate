import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { TenantsService } from './tenants.service.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Tao tenant moi — chi admin duoc tao. Gan owner_id tu user hien tai.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const tenant = await this.tenantsService.create({
      ...dto,
      owner_id: user.id,
    } as any);
    return successResponse(tenant, 'Tenant created');
  }

  /**
   * Danh sach tenant (admin only, co phan trang).
   */
  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@Query() query: PaginationDto) {
    const { items, meta } = await this.tenantsService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay cac tenant cua user hien tai.
   */
  @Get('my')
  async getMyTenants(@CurrentUser() user: ICurrentUser) {
    const tenants = await this.tenantsService.findByOwner(user.id);
    return successResponse(tenants);
  }

  /**
   * Lay chi tiet 1 tenant — chi owner hoac admin duoc xem.
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const tenant = await this.tenantsService.findById(id);
    // Admin xem duoc tat ca; user thuong chi xem tenant cua minh (owner)
    if (user.role !== UserRole.ADMIN && tenant.owner_id !== user.id) {
      throw new ForbiddenException('Cannot access other tenant data');
    }
    return successResponse(tenant);
  }

  /**
   * Cap nhat tenant — chi admin duoc sua.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    const tenant = await this.tenantsService.update(id, dto as any);
    return successResponse(tenant, 'Tenant updated');
  }

  /**
   * Xoa tenant (admin only, soft delete).
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.tenantsService.softDelete(id);
    return successResponse(null, 'Tenant deleted');
  }
}
