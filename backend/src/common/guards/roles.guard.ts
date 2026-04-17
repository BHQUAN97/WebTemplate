import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { UserRole } from '../constants/index.js';
import { ICurrentUser } from '../interfaces/index.js';

/**
 * Guard that checks if the current user has one of the required roles.
 * Works with the @Roles() decorator.
 *
 * IMPORTANT — Default policy is "AUTHENTICATED USERS ONLY":
 *   - Khi KHONG co @Roles() tren route: guard tra ve true, nghia la
 *     ROUTE VAN YEU CAU LOGIN (vi JwtAuthGuard chay truoc da xac thuc
 *     user), chi khong yeu cau role cu the.
 *   - De BYPASS auth (public endpoint): developer PHAI dung @Public()
 *     decorator — JwtAuthGuard se skip, va nguoi dung chua login van
 *     goi duoc route.
 *   - De GATE theo role (admin/manager/...): dung @Roles(UserRole.ADMIN).
 *
 * Noi cach khac:
 *   - @Public()              → ai cung goi duoc
 *   - Khong decorator        → phai login (any role)
 *   - @Roles(UserRole.ADMIN) → phai login VA co role = admin
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // @Public() method-level phai override @Roles() class-level:
    // endpoint public khong can role check (JwtAuthGuard da skip auth).
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Khong co @Roles() -> mac dinh "authenticated users" (JwtAuthGuard da xac thuc)
    // De cho phep public, dung @Public() de bypass JwtAuthGuard.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as ICurrentUser;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
