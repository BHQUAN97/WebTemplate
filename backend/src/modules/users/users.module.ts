import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { GdprExportService } from './gdpr-export.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { Media } from '../media/entities/media.entity.js';
import { AuditLog } from '../audit-logs/entities/audit-log.entity.js';

/**
 * UsersModule — import AuthModule qua forwardRef() de inject AuthService
 * cho luong soft delete (revoke tat ca refresh tokens cua user bi xoa).
 * GdprExportService can access Orders/Media/AuditLog repos de gather data.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Order, OrderItem, Media, AuditLog]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, GdprExportService],
  exports: [UsersService, GdprExportService],
})
export class UsersModule {}
