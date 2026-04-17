import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { CartService } from './cart.service.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import { successResponse } from '../../common/utils/response.js';

/**
 * Resolve (userId, sessionId) — user dang login luon thang tu JWT.
 * Guest bat buoc co header x-customer-session-id. Khong nhan userId tu client
 * de chong IDOR.
 */
function resolveCartIdentity(
  user: ICurrentUser | null,
  sessionId?: string,
): { userId?: string; sessionId?: string } {
  if (user?.id) return { userId: user.id };
  if (!sessionId) {
    throw new BadRequestException(
      'Missing authentication or x-customer-session-id header',
    );
  }
  return { sessionId };
}

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Lay gio hang hien tai. User lay tu JWT; guest phai gui session header.
   */
  @Public()
  @Get()
  async getCart(
    @CurrentUser() user: ICurrentUser | null,
    @Headers('x-customer-session-id') sessionId?: string,
  ) {
    const id = resolveCartIdentity(user, sessionId);
    const cart = await this.cartService.getOrCreateCart(id.userId, id.sessionId);
    return successResponse(cart);
  }

  /**
   * Them san pham vao gio hang.
   */
  @Public()
  @Post('items')
  async addItem(
    @CurrentUser() user: ICurrentUser | null,
    @Body() dto: AddToCartDto,
    @Headers('x-customer-session-id') sessionId?: string,
  ) {
    const id = resolveCartIdentity(user, sessionId);
    const cart = await this.cartService.getOrCreateCart(id.userId, id.sessionId);
    const item = await this.cartService.addItem(cart.id, dto);
    return successResponse(item, 'Item added to cart');
  }

  /**
   * Cap nhat so luong san pham trong gio.
   */
  @Public()
  @Patch('items/:id')
  async updateItem(
    @Param('id') itemId: string,
    @CurrentUser() user: ICurrentUser | null,
    @Body() dto: UpdateCartItemDto,
    @Headers('x-customer-session-id') sessionId?: string,
  ) {
    const id = resolveCartIdentity(user, sessionId);
    const cart = await this.cartService.getOrCreateCart(id.userId, id.sessionId);
    const item = await this.cartService.updateItemQuantity(
      cart.id,
      itemId,
      dto.quantity,
    );
    return successResponse(item, 'Cart item updated');
  }

  /**
   * Xoa san pham khoi gio hang.
   */
  @Public()
  @Delete('items/:id')
  async removeItem(
    @Param('id') itemId: string,
    @CurrentUser() user: ICurrentUser | null,
    @Headers('x-customer-session-id') sessionId?: string,
  ) {
    const id = resolveCartIdentity(user, sessionId);
    const cart = await this.cartService.getOrCreateCart(id.userId, id.sessionId);
    await this.cartService.removeItem(cart.id, itemId);
    return successResponse(null, 'Item removed from cart');
  }

  /**
   * Xoa toan bo gio hang.
   */
  @Public()
  @Delete()
  async clearCart(
    @CurrentUser() user: ICurrentUser | null,
    @Headers('x-customer-session-id') sessionId?: string,
  ) {
    const id = resolveCartIdentity(user, sessionId);
    const cart = await this.cartService.getOrCreateCart(id.userId, id.sessionId);
    await this.cartService.clearCart(cart.id);
    return successResponse(null, 'Cart cleared');
  }

  /**
   * Gop gio hang guest vao gio hang user khi dang nhap.
   * user_id LAY TU JWT — khong nhan tu client de tranh attacker merge cart cua nguoi khac.
   */
  @Post('merge')
  async mergeCart(
    @CurrentUser() user: ICurrentUser,
    @Headers('x-customer-session-id') sessionId?: string,
    @Body() body?: { session_id?: string },
  ) {
    const effectiveSession = sessionId || body?.session_id;
    if (!effectiveSession) {
      throw new BadRequestException('session_id is required');
    }
    const cart = await this.cartService.mergeGuestCart(
      effectiveSession,
      user.id,
    );
    return successResponse(cart, 'Cart merged');
  }
}
