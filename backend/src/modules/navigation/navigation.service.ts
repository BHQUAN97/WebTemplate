import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { Navigation } from './entities/navigation.entity.js';
import { NavigationItem } from './entities/navigation-item.entity.js';
import { CreateNavigationItemDto } from './dto/create-navigation.dto.js';

/**
 * Navigation service — quan ly menu dieu huong, items, sap xep.
 */
@Injectable()
export class NavigationService extends BaseService<Navigation> {
  protected searchableFields = ['name'];

  constructor(
    @InjectRepository(Navigation)
    private readonly navigationRepository: Repository<Navigation>,
    @InjectRepository(NavigationItem)
    private readonly itemsRepository: Repository<NavigationItem>,
  ) {
    super(navigationRepository, 'Navigation');
  }

  /**
   * Tim menu theo vi tri (header, footer, sidebar).
   */
  async findByLocation(location: string): Promise<Navigation | null> {
    return this.navigationRepository.findOne({
      where: { location, is_active: true, deleted_at: null as any },
      relations: ['items', 'items.children'],
    });
  }

  /**
   * Lay menu kem danh sach items (co children).
   */
  async getWithItems(id: string): Promise<Navigation> {
    const nav = await this.navigationRepository.findOne({
      where: { id, deleted_at: null as any },
      relations: ['items', 'items.children'],
    });
    if (!nav) {
      throw new NotFoundException(`Navigation with ID "${id}" not found`);
    }
    return nav;
  }

  /**
   * Cap nhat toan bo items cua 1 menu — xoa cu, tao moi.
   */
  async updateItems(
    navId: string,
    items: CreateNavigationItemDto[],
  ): Promise<Navigation> {
    const nav = await this.findById(navId);

    // Xoa tat ca items cu
    await this.itemsRepository.delete({ navigation_id: navId });

    // Tao items moi
    await this.createItemsRecursive(navId, items, null);

    return this.getWithItems(navId);
  }

  /**
   * Sap xep lai items — cap nhat sort_order.
   */
  async reorderItems(
    navId: string,
    items: { id: string; sort_order: number }[],
  ): Promise<Navigation> {
    await this.findById(navId);

    for (const item of items) {
      await this.itemsRepository.update(item.id, {
        sort_order: item.sort_order,
      });
    }

    return this.getWithItems(navId);
  }

  /**
   * Tao items de quy — ho tro nested children.
   */
  private async createItemsRecursive(
    navId: string,
    items: CreateNavigationItemDto[],
    parentId: string | null,
  ): Promise<void> {
    for (let i = 0; i < items.length; i++) {
      const { children, ...itemData } = items[i];
      const entity = this.itemsRepository.create({
        ...itemData,
        navigation_id: navId,
        parent_id: parentId,
        sort_order: itemData.sort_order ?? i,
      });
      const saved = await this.itemsRepository.save(entity);

      if (children && children.length > 0) {
        await this.createItemsRecursive(navId, children, saved.id);
      }
    }
  }
}
