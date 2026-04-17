import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { Inventory } from '../inventory/entities/inventory.entity.js';
import { User } from '../users/entities/user.entity.js';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';

/**
 * ReportsModule — cung cap endpoints xuat report PDF/XLSX/CSV.
 * Export ReportsService de cron weekly-report dung ben ngoai.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, Inventory, User]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
