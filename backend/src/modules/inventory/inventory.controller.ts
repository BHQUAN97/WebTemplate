import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

/**
 * Inventory — admin-only. Read/write kho hang, movements, adjustments deu can ADMIN/MANAGER.
 */
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * Lay danh sach ton kho (admin, phan trang).
   */
  @Get()
  async findAll(@Query() query: PaginationDto) {
    const { items, meta } = await this.inventoryService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay danh sach san pham sap het hang (admin).
   */
  @Get('low-stock')
  async getLowStock() {
    const items = await this.inventoryService.getLowStockItems();
    return successResponse(items);
  }

  /**
   * Lay lich su bien dong ton kho (admin) — pagination.
   */
  @Get('movements')
  async getMovements(
    @Query('inventoryId') inventoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.inventoryService.getMovements(
      inventoryId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
    return successResponse(result);
  }

  /**
   * Dieu chinh ton kho (admin).
   */
  @Post('adjust')
  async adjust(@Body() dto: AdjustInventoryDto) {
    const inventory = await this.inventoryService.adjustStock(dto);
    return successResponse(inventory, 'Inventory adjusted');
  }

  /**
   * Lay ton kho theo product ID.
   */
  @Get(':productId')
  async getStock(
    @Param('productId') productId: string,
    @Query('variantId') variantId?: string,
  ) {
    const stock = await this.inventoryService.getStock(productId, variantId);
    return successResponse(stock);
  }
}
