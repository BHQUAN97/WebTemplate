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
import { PromotionsService } from './promotions.service.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';
import { QueryPromotionsDto } from './dto/query-promotions.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  /**
   * Admin — lay danh sach khuyen mai (phan trang).
   */
  @Roles(UserRole.ADMIN)
  @Get()
  async findAll(@Query() query: QueryPromotionsDto) {
    const { items, meta } = await this.promotionsService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Public — lay khuyen mai dang hoat dong.
   */
  @Public()
  @Get('active')
  async getActive() {
    const items = await this.promotionsService.getActivePromotions();
    return successResponse(items);
  }

  /**
   * Admin — lay chi tiet khuyen mai.
   */
  @Roles(UserRole.ADMIN)
  @Get(':id')
  async findById(@Param('id') id: string) {
    const promotion = await this.promotionsService.findById(id);
    return successResponse(promotion);
  }

  /**
   * Admin — thong ke su dung khuyen mai.
   */
  @Roles(UserRole.ADMIN)
  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    const stats = await this.promotionsService.getUsageStats(id);
    return successResponse(stats);
  }

  /**
   * Admin — tao khuyen mai moi.
   */
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreatePromotionDto) {
    const promotion = await this.promotionsService.create(dto as any);
    return successResponse(promotion, 'Promotion created');
  }

  /**
   * Public — validate ma giam gia.
   */
  @Post('validate')
  async validate(
    @Body() body: { code: string; user_id: string; order_amount: number },
  ) {
    const result = await this.promotionsService.validate(
      body.code,
      body.user_id,
      body.order_amount,
    );
    return successResponse(result);
  }

  /**
   * Admin — cap nhat khuyen mai.
   */
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    const promotion = await this.promotionsService.update(id, dto as any);
    return successResponse(promotion, 'Promotion updated');
  }

  /**
   * Admin — xoa khuyen mai.
   */
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.promotionsService.softDelete(id);
    return successResponse(null, 'Promotion deleted');
  }
}
