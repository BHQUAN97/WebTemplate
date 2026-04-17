import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { NavigationService } from './navigation.service.js';
import {
  CreateNavigationDto,
  CreateNavigationItemDto,
} from './dto/create-navigation.dto.js';
import { UpdateNavigationDto } from './dto/update-navigation.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  /**
   * Lay danh sach menu (admin, phan trang).
   */
  @Get()
  async findAll(@Query() query: PaginationDto) {
    const { items, meta } = await this.navigationService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay menu theo vi tri (public) — header, footer, sidebar.
   */
  @Public()
  @Get('location/:location')
  async findByLocation(@Param('location') location: string) {
    const nav = await this.navigationService.findByLocation(location);
    return successResponse(nav);
  }

  /**
   * Lay chi tiet menu kem items.
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    const nav = await this.navigationService.getWithItems(id);
    return successResponse(nav);
  }

  /**
   * Tao menu moi.
   */
  @Post()
  async create(@Body() dto: CreateNavigationDto) {
    const nav = await this.navigationService.create(dto as any);
    // Tao items neu co
    if (dto.items && dto.items.length > 0) {
      return successResponse(
        await this.navigationService.updateItems(nav.id, dto.items),
        'Navigation created',
      );
    }
    return successResponse(nav, 'Navigation created');
  }

  /**
   * Cap nhat items cua menu (admin).
   */
  @Put(':id/items')
  async updateItems(
    @Param('id') id: string,
    @Body() items: CreateNavigationItemDto[],
  ) {
    const nav = await this.navigationService.updateItems(id, items);
    return successResponse(nav, 'Navigation items updated');
  }

  /**
   * Sap xep lai items.
   */
  @Put(':id/reorder')
  async reorderItems(
    @Param('id') id: string,
    @Body() items: { id: string; sort_order: number }[],
  ) {
    const nav = await this.navigationService.reorderItems(id, items);
    return successResponse(nav, 'Items reordered');
  }

  /**
   * Cap nhat menu.
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateNavigationDto) {
    const nav = await this.navigationService.update(id, dto as any);
    return successResponse(nav, 'Navigation updated');
  }

  /**
   * Xoa mem menu.
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.navigationService.softDelete(id);
    return successResponse(null, 'Navigation deleted');
  }
}
