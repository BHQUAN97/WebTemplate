import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { I18nService } from './i18n.service.js';
import { CreateTranslationDto } from './dto/create-translation.dto.js';
import { BulkTranslationsDto } from './dto/bulk-translations.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import { successResponse } from '../../common/utils/response.js';

@Controller('i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  /**
   * Lay translations cua 1 locale (public).
   * Query param: namespace (optional).
   */
  @Get(':locale')
  @Public()
  async getTranslations(
    @Param('locale') locale: string,
    @Query('namespace') namespace?: string,
  ) {
    const translations = await this.i18nService.getTranslations(
      locale,
      namespace,
    );
    return successResponse(translations);
  }

  /**
   * Set 1 translation (admin only).
   */
  @Post()
  @Roles(UserRole.ADMIN)
  async setTranslation(@Body() dto: CreateTranslationDto) {
    const translation = await this.i18nService.setTranslation(dto);
    return successResponse(translation, 'Translation saved');
  }

  /**
   * Set nhieu translations cung luc (admin only).
   */
  @Post('bulk')
  @Roles(UserRole.ADMIN)
  async bulkSet(@Body() dto: BulkTranslationsDto) {
    const results = await this.i18nService.bulkSet(dto);
    return successResponse(results, `${results.length} translations saved`);
  }

  /**
   * Lay danh sach locales (public).
   */
  @Get('locales')
  @Public()
  async getLocales() {
    const locales = await this.i18nService.getLocales();
    return successResponse(locales);
  }

  /**
   * Dat locale mac dinh (admin only).
   */
  @Put('locales/:code/default')
  @Roles(UserRole.ADMIN)
  async setDefaultLocale(@Param('code') code: string) {
    const locale = await this.i18nService.setDefaultLocale(code);
    return successResponse(locale, `Default locale set to "${code}"`);
  }

  /**
   * Export translations cua 1 locale thanh JSON (admin only).
   */
  @Get('export/:locale')
  @Roles(UserRole.ADMIN)
  async exportLocale(@Param('locale') locale: string) {
    const data = await this.i18nService.exportLocale(locale);
    return successResponse(data);
  }

  /**
   * Import translations tu JSON cho 1 locale (admin only).
   */
  @Post('import/:locale')
  @Roles(UserRole.ADMIN)
  async importLocale(
    @Param('locale') locale: string,
    @Body() data: Record<string, Record<string, string>>,
  ) {
    const result = await this.i18nService.importLocale(locale, data);
    return successResponse(result, `Imported ${result.imported} translations`);
  }
}
