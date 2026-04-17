import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { QueryOrdersDto } from './dto/query-orders.dto.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Tao don hang moi.
   */
  @Post()
  async create(
    @Body() dto: CreateOrderDto,
    @Query('userId') userId: string,
  ) {
    const order = await this.ordersService.createDirect(userId, dto);
    return successResponse(order, 'Order created');
  }

  /**
   * Lay danh sach don hang (admin: tat ca, user: cua minh).
   */
  @Get()
  async findAll(@Query() query: QueryOrdersDto) {
    const { items, meta } = await this.ordersService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay chi tiet don hang theo ID.
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    const order = await this.ordersService.getOrderWithItems(id);
    return successResponse(order);
  }

  /**
   * Cap nhat trang thai don hang (admin).
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const order = await this.ordersService.updateStatus(
      id,
      dto.status,
      dto.reason,
    );
    return successResponse(order, 'Order status updated');
  }

  /**
   * Huy don hang.
   */
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const order = await this.ordersService.cancelOrder(id, body.reason);
    return successResponse(order, 'Order cancelled');
  }
}
