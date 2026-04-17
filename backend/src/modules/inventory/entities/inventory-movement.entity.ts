import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { generateUlid } from '../../../common/utils/ulid.js';

/**
 * Enum loai bien dong ton kho.
 */
export enum MovementType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment',
  RESERVED = 'reserved',
  RELEASED = 'released',
}

/**
 * Lich su bien dong ton kho — ghi nhan moi thay doi so luong.
 */
@Entity('inventory_movements')
@Index(['inventory_id', 'created_at'])
@Index(['reference_type', 'reference_id'])
export class InventoryMovement {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  inventory_id: string;

  @Column({ type: 'int' })
  quantity_change: number;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reference_type: string | null;

  @Column({ type: 'char', length: 26, nullable: true })
  reference_id: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'char', length: 26, nullable: true })
  created_by: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = generateUlid();
    }
  }
}
