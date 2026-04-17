import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { QueryOrdersDto } from './dto/query-orders.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Tao don hang moi cho user dang dang nhap.
   * userId lay tu JWT (khong cho client truyen) de chong IDOR.
   */
  @Post()
  async create(@CurrentUser() user: ICurrentUser, @Body() dto: CreateOrderDto) {
    const order = await this.ordersService.createDirect(user.id, dto);
    return successResponse(order, 'Order created');
  }

  /**
   * Lay danh sach don hang. Non-admin chi thay don cua minh (force user_id tu JWT).
   */
  @Get()
  async findAll(
    @Query() query: QueryOrdersDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    const scoped: QueryOrdersDto = isAdmin
      ? query
      : { ...query, user_id: user.id };
    const { items, meta } = await this.ordersService.findAll(scoped);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay chi tiet don hang theo ID. Non-admin chi xem duoc don cua chinh minh.
   */
  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    const order = await this.ordersService.getOrderWithItems(id);
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    if (!isAdmin && order.user_id !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
    }
    return successResponse(order);
  }

  /**
   * Cap nhat trang thai don hang (admin only).
   */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
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
   * Huy don hang. Non-admin chi huy duoc don cua minh.
   */
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: ICurrentUser,
  ) {
    const existing = await this.ordersService.getOrderWithItems(id);
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    if (!isAdmin && existing.user_id !== user.id) {
      throw new ForbiddenException('Bạn không có quyền huỷ đơn hàng này');
    }
    const order = await this.ordersService.cancelOrder(id, body.reason);
    return successResponse(order, 'Order cancelled');
  }
}
