import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { UpdateSettingDto } from './dto/update-setting.dto.js';
import { CreateSettingDto } from './dto/create-setting.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Lay danh sach tat ca settings (admin only, co phan trang).
   */
  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@Query() query: PaginationDto) {
    const { items, meta } = await this.settingsService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay cac settings cong khai (khong can dang nhap).
   */
  @Get('public')
  @Public()
  async getPublicSettings() {
    const settings = await this.settingsService.getPublicSettings();
    return successResponse(settings);
  }

  /**
   * Lay 1 setting theo key.
   */
  @Get(':key')
  @Roles(UserRole.ADMIN)
  async getByKey(@Param('key') key: string) {
    const setting = await this.settingsService.get(key);
    return successResponse(setting);
  }

  /**
   * Cap nhat gia tri 1 setting (admin only).
   */
  @Put(':key')
  @Roles(UserRole.ADMIN)
  async updateByKey(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    const setting = await this.settingsService.get(key);
    const updated = await this.settingsService.update(setting.id, {
      value: dto.value,
      description: dto.description ?? setting.description,
    } as any);
    return successResponse(updated);
  }

  /**
   * Cap nhat nhieu settings cung luc (admin only).
   */
  @Post('bulk')
  @Roles(UserRole.ADMIN)
  async bulkSet(@Body() body: { settings: { key: string; value: string }[] }) {
    const results = await this.settingsService.bulkSet(body.settings);
    return successResponse(results);
  }
}
