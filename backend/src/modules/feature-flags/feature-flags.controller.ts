import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service.js';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto.js';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import { successResponse, paginatedResponse } from '../../common/utils/response.js';

/**
 * Admin CRUD cho feature flags.
 */
@ApiTags('Feature Flags')
@ApiBearerAuth()
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Liet ke feature flags (admin)' })
  async findAll(@Query() query: PaginationDto) {
    const { items, meta } = await this.featureFlagsService.findAll(query);
    return paginatedResponse(items, meta);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xem chi tiet 1 feature flag' })
  async findOne(@Param('id') id: string) {
    const flag = await this.featureFlagsService.findById(id);
    return successResponse(flag);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Tao feature flag moi' })
  async create(@Body() dto: CreateFeatureFlagDto) {
    const flag = await this.featureFlagsService.createFlag(dto);
    return successResponse(flag, 'Feature flag created');
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cap nhat feature flag' })
  async update(@Param('id') id: string, @Body() dto: UpdateFeatureFlagDto) {
    const flag = await this.featureFlagsService.updateFlag(id, dto);
    return successResponse(flag, 'Feature flag updated');
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xoa (soft) feature flag' })
  async remove(@Param('id') id: string) {
    await this.featureFlagsService.deleteFlag(id);
    return successResponse(null, 'Feature flag deleted');
  }
}
