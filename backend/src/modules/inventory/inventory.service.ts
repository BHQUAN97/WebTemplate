import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThanOrEqual } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { Inventory } from './entities/inventory.entity.js';
import {
  InventoryMovement,
  MovementType,
} from './entities/inventory-movement.entity.js';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto.js';

/**
 * Inventory service — quan ly ton kho, dat truoc, ghi lich su bien dong.
 */
@Injectable()
export class InventoryService extends BaseService<Inventory> {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepository: Repository<InventoryMovement>,
  ) {
    super(inventoryRepository, 'Inventory');
  }

  /**
   * Lay ton kho theo product/variant.
   */
  async getStock(
    productId: string,
    variantId?: string,
  ): Promise<Inventory | null> {
    return this.inventoryRepository.findOne({
      where: {
        product_id: productId,
        variant_id: variantId || (IsNull() as any),
        deleted_at: IsNull(),
      },
    });
  }

  /**
   * Dieu chinh ton kho va ghi lich su.
   */
  async adjustStock(dto: AdjustInventoryDto): Promise<Inventory> {
    let inventory = await this.getStock(
      dto.product_id!,
      dto.variant_id,
    );

    if (!inventory) {
      // Tao moi neu chua co
      inventory = await this.create({
        product_id: dto.product_id,
        variant_id: dto.variant_id || null,
        quantity: 0,
      } as any);
    }

    inventory.quantity += dto.quantity_change;
    if (inventory.quantity < 0 && !inventory.allow_backorder) {
      throw new BadRequestException('Insufficient stock');
    }

    const saved = await this.inventoryRepository.save(inventory);

    await this.recordMovement({
      inventory_id: inventory.id,
      quantity_change: dto.quantity_change,
      type: dto.type,
      note: dto.note || null,
    });

    return saved;
  }

  /**
   * Dat truoc ton kho cho don hang.
   * ATOMIC: dung UPDATE ... WHERE quantity-reserved >= :qty de tranh oversell
   * khi 2 order dat cung luc (check-then-act race condition).
   */
  async reserveStock(
    productId: string,
    quantity: number,
    variantId?: string,
  ): Promise<void> {
    const inventory = await this.getStock(productId, variantId);
    if (!inventory) {
      throw new BadRequestException('Inventory record not found');
    }

    if (inventory.allow_backorder) {
      // Cho phep backorder — khong can check available, chi tang reserved
      await this.inventoryRepository.increment(
        { id: inventory.id },
        'reserved',
        quantity,
      );
    } else {
      // Atomic UPDATE voi dieu kien con du stock
      const result = await this.inventoryRepository
        .createQueryBuilder()
        .update(Inventory)
        .set({ reserved: () => `reserved + ${Number(quantity) || 0}` })
        .where('id = :id', { id: inventory.id })
        .andWhere('quantity - reserved >= :qty', { qty: quantity })
        .execute();

      if (!result.affected) {
        const fresh = await this.getStock(productId, variantId);
        const available = fresh
          ? fresh.quantity - fresh.reserved
          : 0;
        throw new BadRequestException(
          `Insufficient stock. Available: ${available}`,
        );
      }
    }

    await this.recordMovement({
      inventory_id: inventory.id,
      quantity_change: -quantity,
      type: MovementType.RESERVED,
      note: `Reserved ${quantity} units`,
    });
  }

  /**
   * Giai phong ton kho da dat truoc (huy don).
   * ATOMIC: dung UPDATE voi GREATEST de tranh reserved am.
   */
  async releaseStock(
    productId: string,
    quantity: number,
    variantId?: string,
  ): Promise<void> {
    const inventory = await this.getStock(productId, variantId);
    if (!inventory) {
      throw new BadRequestException('Inventory record not found');
    }

    await this.inventoryRepository
      .createQueryBuilder()
      .update(Inventory)
      .set({
        reserved: () =>
          `GREATEST(0, reserved - ${Number(quantity) || 0})`,
      })
      .where('id = :id', { id: inventory.id })
      .execute();

    await this.recordMovement({
      inventory_id: inventory.id,
      quantity_change: quantity,
      type: MovementType.RELEASED,
      note: `Released ${quantity} units`,
    });
  }

  /**
   * Lay danh sach san pham sap het hang.
   */
  async getLowStockItems(): Promise<Inventory[]> {
    return this.inventoryRepository
      .createQueryBuilder('inv')
      .where('inv.deleted_at IS NULL')
      .andWhere('inv.track_inventory = :track', { track: true })
      .andWhere('inv.quantity <= inv.low_stock_threshold')
      .getMany();
  }

  /**
   * Kiem tra con hang khong.
   */
  async isInStock(
    productId: string,
    variantId?: string,
    quantity = 1,
  ): Promise<boolean> {
    const inventory = await this.getStock(productId, variantId);
    if (!inventory) return false;
    if (!inventory.track_inventory) return true;
    if (inventory.allow_backorder) return true;
    return inventory.quantity - inventory.reserved >= quantity;
  }

  /**
   * Ghi nhan bien dong ton kho.
   */
  async recordMovement(data: {
    inventory_id: string;
    quantity_change: number;
    type: MovementType;
    reference_type?: string;
    reference_id?: string;
    note?: string | null;
    created_by?: string;
  }): Promise<InventoryMovement> {
    const movement = this.movementRepository.create(data);
    return this.movementRepository.save(movement);
  }

  /**
   * Lay lich su bien dong ton kho.
   */
  async getMovements(inventoryId?: string): Promise<InventoryMovement[]> {
    const qb = this.movementRepository
      .createQueryBuilder('m')
      .orderBy('m.created_at', 'DESC')
      .take(100);

    if (inventoryId) {
      qb.where('m.inventory_id = :inventoryId', { inventoryId });
    }

    return qb.getMany();
  }
}
