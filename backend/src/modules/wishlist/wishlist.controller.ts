import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import { successResponse } from '../../common/utils/response.js';

@ApiTags('Wishlist')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  /**
   * GET /wishlist — lay danh sach yeu thich cua user dang nhap.
   */
  @Get()
  async getWishlist(@CurrentUser() user: ICurrentUser) {
    const items = await this.wishlistService.getWishlist(user.id);
    return successResponse(items, 'Wishlist fetched');
  }

  /**
   * GET /wishlist/count — so luong san pham yeu thich.
   */
  @Get('count')
  async getCount(@CurrentUser() user: ICurrentUser) {
    const count = await this.wishlistService.getCount(user.id);
    return successResponse({ count }, 'Count fetched');
  }

  /**
   * GET /wishlist/check/:productId — kiem tra san pham co trong wishlist khong.
   */
  @Get('check/:productId')
  async checkWishlist(
    @CurrentUser() user: ICurrentUser,
    @Param('productId') productId: string,
  ) {
    const inWishlist = await this.wishlistService.isInWishlist(user.id, productId);
    return successResponse({ inWishlist }, 'Checked');
  }

  /**
   * POST /wishlist/:productId — them san pham vao danh sach yeu thich.
   */
  @Post(':productId')
  async addToWishlist(
    @CurrentUser() user: ICurrentUser,
    @Param('productId') productId: string,
  ) {
    const item = await this.wishlistService.addToWishlist(
      user.id,
      productId,
      user.tenantId || null,
    );
    return successResponse(item, 'Da them vao danh sach yeu thich');
  }

  /**
   * DELETE /wishlist/:productId — xoa san pham khoi danh sach yeu thich.
   */
  @Delete(':productId')
  async removeFromWishlist(
    @CurrentUser() user: ICurrentUser,
    @Param('productId') productId: string,
  ) {
    await this.wishlistService.removeFromWishlist(user.id, productId);
    return successResponse(null, 'Da xoa khoi danh sach yeu thich');
  }
}
