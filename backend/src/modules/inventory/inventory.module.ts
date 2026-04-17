import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from './entities/inventory.entity.js';
import { InventoryMovement } from './entities/inventory-movement.entity.js';
import { InventoryService } from './inventory.service.js';
import { InventoryController } from './inventory.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, InventoryMovement])],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
