import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ICurrentUser } from '../interfaces/index.js';

/**
 * Parameter decorator to extract the current authenticated user from request.
 *
 * @example
 * ```ts
 * @Get('profile')
 * getProfile(@CurrentUser() user: ICurrentUser) {
 *   return user;
 * }
 *
 * // Extract a specific property
 * @Get('my-id')
 * getMyId(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof ICurrentUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as ICurrentUser;

    if (!user) return null;
    return data ? user[data] : user;
  },
);
