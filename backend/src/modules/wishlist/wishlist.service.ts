import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity.js';

export interface WishlistItemWithProduct {
  id: string;
  product_id: string;
  added_at: Date;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compare_at_price: number | null;
    images: { url: string; alt: string }[] | null;
    is_active: boolean;
  } | null;
}

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepo: Repository<Wishlist>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Lay danh sach yeu thich cua user, kem thong tin san pham.
   * JOIN voi products table de tra ve day du data cho FE.
   */
  async getWishlist(userId: string): Promise<WishlistItemWithProduct[]> {
    const rows = await this.dataSource.query<any[]>(
      `SELECT
        w.id, w.product_id, w.created_at AS added_at,
        p.id AS p_id, p.name AS p_name, p.slug AS p_slug,
        p.price AS p_price, p.compare_at_price AS p_compare_at_price,
        p.images AS p_images, p.is_active AS p_is_active
       FROM wishlists w
       LEFT JOIN products p ON p.id = w.product_id AND p.deleted_at IS NULL
       WHERE w.user_id = ? AND w.deleted_at IS NULL
       ORDER BY w.created_at DESC`,
      [userId],
    );

    return rows.map((r) => ({
      id: r.id,
      product_id: r.product_id,
      added_at: r.added_at,
      product: r.p_id
        ? {
            id: r.p_id,
            name: r.p_name,
            slug: r.p_slug,
            price: Number(r.p_price),
            compare_at_price: r.p_compare_at_price
              ? Number(r.p_compare_at_price)
              : null,
            images: r.p_images
              ? typeof r.p_images === 'string'
                ? JSON.parse(r.p_images)
                : r.p_images
              : null,
            is_active: Boolean(r.p_is_active),
          }
        : null,
    }));
  }

  async addToWishlist(
    userId: string,
    productId: string,
    tenantId: string | null,
  ): Promise<Wishlist> {
    const existing = await this.wishlistRepo.findOne({
      where: { user_id: userId, product_id: productId },
    });
    if (existing) {
      throw new ConflictException('San pham da co trong danh sach yeu thich');
    }

    const item = this.wishlistRepo.create({
      user_id: userId,
      product_id: productId,
      tenant_id: tenantId,
    });
    return this.wishlistRepo.save(item);
  }

  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    const item = await this.wishlistRepo.findOne({
      where: { user_id: userId, product_id: productId },
    });
    if (!item) {
      throw new NotFoundException('San pham khong co trong danh sach yeu thich');
    }
    await this.wishlistRepo.remove(item);
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const count = await this.wishlistRepo.count({
      where: { user_id: userId, product_id: productId },
    });
    return count > 0;
  }

  async getCount(userId: string): Promise<number> {
    return this.wishlistRepo.count({ where: { user_id: userId } });
  }
}
