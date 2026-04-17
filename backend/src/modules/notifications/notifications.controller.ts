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
import { NotificationsService } from './notifications.service.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { QueryNotificationsDto } from './dto/query-notifications.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import { UserRole } from '../../common/constants/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Lay thong bao cua user hien tai (phan trang).
   * Chi tra ve notifications cua chinh user — filter bang user_id tu JWT.
   */
  @Get()
  async findAll(
    @CurrentUser() user: ICurrentUser,
    @Query() query: QueryNotificationsDto,
  ) {
    // Gan user_id vao query de BaseService.findAll co the filter qua applyFilters
    const queryWithUser = { ...query, user_id: user.id } as any;
    const { items, meta } = await this.notificationsService.findAll(queryWithUser);
    return paginatedResponse(items, meta);
  }

  /**
   * Dem thong bao chua doc cua user hien tai.
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: ICurrentUser) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return successResponse({ count });
  }

  /**
   * Danh dau 1 thong bao da doc (chi owner moi duoc doi).
   */
  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: ICurrentUser,
    @Param('id') id: string,
  ) {
    const notification = await this.notificationsService.markAsRead(id, user.id);
    return successResponse(notification, 'Marked as read');
  }

  /**
   * Danh dau tat ca thong bao cua user hien tai la da doc.
   */
  @Patch('read-all')
  async markAllRead(@CurrentUser() user: ICurrentUser) {
    await this.notificationsService.markAllRead(user.id);
    return successResponse(null, 'All notifications marked as read');
  }

  /**
   * Admin — gui thong bao moi cho user bat ky.
   */
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateNotificationDto) {
    const notification = await this.notificationsService.send(dto);
    return successResponse(notification, 'Notification sent');
  }

  /**
   * Xoa thong bao.
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.notificationsService.softDelete(id);
    return successResponse(null, 'Notification deleted');
  }
}
