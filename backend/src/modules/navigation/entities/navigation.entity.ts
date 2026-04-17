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

  @OneToMany(() => NavigationItem, (item) => item.navigation, {
    cascade: true,
    eager: true,
  })
  items: NavigationItem[];
}
