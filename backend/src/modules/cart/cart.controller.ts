import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CartService } from './cart.service.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { successResponse } from '../../common/utils/response.js';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Lay gio hang hien tai (theo userId hoac sessionId).
   */
  @Get()
  async getCart(
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    return successResponse(cart);
  }

  /**
   * Them san pham vao gio hang.
   */
  @Post('items')
  async addItem(
    @Body() dto: AddToCartDto,
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    const item = await this.cartService.addItem(cart.id, dto);
    return successResponse(item, 'Item added to cart');
  }

  /**
   * Cap nhat so luong san pham trong gio.
   */
  @Patch('items/:id')
  async updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    const item = await this.cartService.updateItemQuantity(
      cart.id,
      id,
      dto.quantity,
    );
    return successResponse(item, 'Cart item updated');
  }

  /**
   * Xoa san pham khoi gio hang.
   */
  @Delete('items/:id')
  async removeItem(
    @Param('id') id: string,
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    await this.cartService.removeItem(cart.id, id);
    return successResponse(null, 'Item removed from cart');
  }

  /**
   * Xoa toan bo gio hang.
   */
  @Delete()
  async clearCart(
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    await this.cartService.clearCart(cart.id);
    return successResponse(null, 'Cart cleared');
  }

  /**
   * Gop gio hang guest vao gio hang user khi dang nhap.
   */
  @Post('merge')
  async mergeCart(
    @Body() body: { session_id: string; user_id: string },
  ) {
    const cart = await this.cartService.mergeGuestCart(
      body.session_id,
      body.user_id,
    );
    return successResponse(cart, 'Cart merged');
  }
}
