import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { NavigationItem } from './navigation-item.entity.js';

/**
 * Menu dieu huong — header, footer, sidebar. Chua danh sach items.
 */
@Entity('navigations')
@Index(['tenant_id', 'location'])
export class Navigation extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  location: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  tenant_id: string | null;

  // Khong dung eager — list endpoint se load toan bo items gay chi phi lon.
  // Caller phai explicit request qua relations: ['items'] khi can.
  @OneToMany(() => NavigationItem, (item) => item.navigation, {
    cascade: true,
  })
  items: NavigationItem[];
}
