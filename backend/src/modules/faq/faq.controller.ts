import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { FaqService } from './faq.service.js';
import { CreateFaqDto } from './dto/create-faq.dto.js';
import { UpdateFaqDto } from './dto/update-faq.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  /**
   * Public — lay FAQ dang active (loc theo category).
   */
  @Public()
  @Get()
  async findActive(@Query('category_id') categoryId?: string) {
    const items = await this.faqService.findActive(categoryId);
    return successResponse(items);
  }

  /**
   * Public — lay FAQ pho bien nhat.
   */
  @Public()
  @Get('popular')
  async findPopular(@Query('limit') limit?: number) {
    const items = await this.faqService.findPopular(limit || 10);
    return successResponse(items);
  }

  /**
   * Admin — lay tat ca FAQ (phan trang).
   */
  @Roles(UserRole.ADMIN)
  @Get('admin')
  async findAll(@Query() query: PaginationDto) {
    const { items, meta } = await this.faqService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Admin — tao FAQ moi.
   */
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateFaqDto) {
    const faq = await this.faqService.create(dto as any);
    return successResponse(faq, 'FAQ created');
  }

  /**
   * Admin — cap nhat FAQ.
   */
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    const faq = await this.faqService.update(id, dto as any);
    return successResponse(faq, 'FAQ updated');
  }

  /**
   * Admin — xoa FAQ.
   */
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.faqService.softDelete(id);
    return successResponse(null, 'FAQ deleted');
  }

  /**
   * Public — binh chon FAQ co ich / khong co ich.
   */
  @Public()
  @Post(':id/vote')
  async vote(
    @Param('id') id: string,
    @Body('helpful') helpful: boolean,
  ) {
    // Tang luot xem luon khi vote
    await this.faqService.incrementView(id);
    const faq = await this.faqService.vote(id, helpful);
    return successResponse(faq, 'Vote recorded');
  }

  /**
   * Admin — sap xep lai thu tu FAQ.
   */
  @Roles(UserRole.ADMIN)
  @Put('reorder')
  async reorder(@Body() items: Array<{ id: string; sort_order: number }>) {
    await this.faqService.reorder(items);
    return successResponse(null, 'FAQ reordered');
  }
}
