import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { QueryCategoriesDto } from './dto/query-categories.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Lay danh sach categories co phan trang va filter.
   */
  @Get()
  @Public()
  async findAll(@Query() query: QueryCategoriesDto) {
    const { items, meta } = await this.categoriesService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay cay phan cap danh muc theo type.
   */
  @Get('tree')
  @Public()
  async getTree(@Query('type') type?: string) {
    const tree = await this.categoriesService.findTree(type);
    return successResponse(tree);
  }

  /**
   * Lay chi tiet 1 category theo ID.
   */
  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    const category = await this.categoriesService.findById(id);
    return successResponse(category);
  }

  /**
   * Tao category moi (admin only).
   */
  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateCategoryDto) {
    const category = await this.categoriesService.create(dto as any);
    return successResponse(category, 'Category created successfully');
  }

  /**
   * Cap nhat category (admin only).
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const category = await this.categoriesService.update(id, dto as any);
    return successResponse(category, 'Category updated successfully');
  }

  /**
   * Xoa category (soft delete, admin only).
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.categoriesService.softDelete(id);
    return successResponse(null, 'Category deleted successfully');
  }

  /**
   * Cap nhat thu tu sap xep (admin only).
   */
  @Put('reorder')
  @Roles(UserRole.ADMIN)
  async reorder(@Body() body: { items: { id: string; sort_order: number }[] }) {
    await this.categoriesService.reorder(body.items);
    return successResponse(null, 'Categories reordered successfully');
  }
}
