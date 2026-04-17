import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ICurrentUser } from '../interfaces/index.js';
import { UserRole } from '../constants/index.js';

/**
 * Guard that ensures tenant isolation in multi-tenant setups.
 * - Admin users bypass tenant check (can access all tenants).
 * - Other users must have a tenant_id and can only access their own tenant's data.
 *
 * Reads tenant from:
 * 1. Request header 'x-tenant-id' (admin only)
 * 2. User's JWT tenant_id
 *
 * Sets `request.tenantId` for downstream use (BaseService auto-filter, etc.).
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Bo qua route cong khai — khong can kiem tra tenant
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as ICurrentUser | undefined;

    // Khong co user (route khong yeu cau auth) → bo qua tenant check
    if (!user) {
      return true;
    }

    // Lay tenant_id tu JWT (ho tro ca tenantId camelCase va tenant_id snake_case)
    const userTenantId =
      (user as any).tenant_id ?? (user as any).tenantId ?? null;

    // Admin co the truy cap moi tenant (uu tien header, fallback JWT)
    if (user.role === UserRole.ADMIN) {
      request.tenantId = request.headers['x-tenant-id'] || userTenantId;
      return true;
    }

    // User thuong bat buoc phai co tenant_id trong JWT
    if (!userTenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    // Chan tan cong cross-tenant: user khong duoc override tenant qua header
    const headerTenantId = request.headers['x-tenant-id'];
    if (headerTenantId && headerTenantId !== userTenantId) {
      throw new ForbiddenException('Cannot access other tenant data');
    }

    // Gan tenantId vao request cho BaseService auto-filter
    request.tenantId = userTenantId;
    return true;
  }
}
