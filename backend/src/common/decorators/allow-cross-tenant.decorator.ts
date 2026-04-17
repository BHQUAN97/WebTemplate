import { SetMetadata } from '@nestjs/common';

/**
 * Key metadata cho TenantGuard check.
 * Default: admin dung tenant cua chinh minh tu JWT.
 * Endpoint co @AllowCrossTenant(): admin co the override bang header x-tenant-id.
 */
export const ALLOW_CROSS_TENANT_KEY = 'allow-cross-tenant';

/**
 * Cho phep admin chuyen tenant qua header x-tenant-id o endpoint nay.
 * Chi dat cho cac endpoint admin can thiet (vd: audit log export, tenant switcher).
 */
export const AllowCrossTenant = () => SetMetadata(ALLOW_CROSS_TENANT_KEY, true);
