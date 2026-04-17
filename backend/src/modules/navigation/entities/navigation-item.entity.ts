import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Navigation } from './navigation.entity.js';

/**
 * Muc menu — ho tro self-ref (parent/children), link ngoai hoac page noi bo.
 */
@Entity('navigation_items')
@Index(['navigation_id', 'parent_id', 'sort_order'])
export class NavigationItem extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  navigation_id: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url: string | null;

  @Column({ type: 'char', length: 26, nullable: true })
  page_id: string | null;

  @Column({ type: 'char', length: 26, nullable: true })
  parent_id: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  @Column({ type: 'varchar', length: 10, default: '_self' })
  target: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ManyToOne(() => Navigation, (nav) => nav.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'navigation_id' })
  navigation: Navigation;

  @ManyToOne(() => NavigationItem, (item) => item.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: NavigationItem | null;

  @OneToMany(() => NavigationItem, (item) => item.parent)
  children: NavigationItem[];
}
