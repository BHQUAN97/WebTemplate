import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ALLOW_CROSS_TENANT_KEY } from '../decorators/allow-cross-tenant.decorator.js';
import { ICurrentUser } from '../interfaces/index.js';
import { UserRole } from '../constants/index.js';

/**
 * Guard that ensures tenant isolation in multi-tenant setups.
 * - User thuong bat buoc phai co tenant_id trong JWT va chi truy cap tenant cua minh.
 * - Admin mac dinh CUNG dung tenant tu JWT — khong cho override header (chong rui ro
 *   compromised admin account truy cap all tenants).
 * - Endpoint co @AllowCrossTenant(): admin moi co the override bang header x-tenant-id
 *   (audit log export, tenant switcher admin dashboard, ...).
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as ICurrentUser | undefined;

    if (!user) {
      return true;
    }

    const userTenantId =
      (user as any).tenant_id ?? (user as any).tenantId ?? null;

    const allowCrossTenant = this.reflector.getAllAndOverride<boolean>(
      ALLOW_CROSS_TENANT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Admin chi duoc override tenant qua header O ENDPOINT opt-in
    if (user.role === UserRole.ADMIN && allowCrossTenant) {
      request.tenantId = request.headers['x-tenant-id'] || userTenantId;
      return true;
    }

    // Tat ca endpoint con lai: user (ke ca admin) chi dung tenant tu JWT
    if (!userTenantId && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Tenant context required');
    }

    // Chan tan cong cross-tenant qua header
    const headerTenantId = request.headers['x-tenant-id'];
    if (headerTenantId && headerTenantId !== userTenantId) {
      throw new ForbiddenException('Cannot access other tenant data');
    }

    request.tenantId = userTenantId;
    return true;
  }
}
