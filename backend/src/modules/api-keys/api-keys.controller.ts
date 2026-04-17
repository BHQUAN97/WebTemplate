import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ApiKeysService, AVAILABLE_SCOPES } from './api-keys.service.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import { successResponse } from '../../common/utils/response.js';

@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  /**
   * Tao API key moi — tra ve full key 1 lan duy nhat.
   */
  @Post()
  async create(
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const result = await this.apiKeysService.generate(user.tenantId!, dto);
    return successResponse(
      { ...result.apiKey, key: result.key },
      'API key created. Save the key — it will not be shown again.',
    );
  }

  /**
   * Lay danh sach API keys cua tenant (khong tra ve key/hash).
   */
  @Get()
  async getByTenant(@CurrentUser() user: ICurrentUser) {
    const keys = await this.apiKeysService.getByTenant(user.tenantId!);
    // An key_hash truoc khi tra ve
    const sanitized = keys.map(({ key_hash, ...rest }) => rest);
    return successResponse(sanitized);
  }

  /**
   * Lay danh sach scopes kha dung.
   */
  @Get('scopes')
  async getScopes() {
    return successResponse(AVAILABLE_SCOPES);
  }

  /**
   * Thu hoi API key — service verify tenant ownership de chong IDOR.
   */
  @Delete(':id')
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    await this.apiKeysService.revoke(id, user.tenantId);
    return successResponse(null, 'API key revoked');
  }
}
