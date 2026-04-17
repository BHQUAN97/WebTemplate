import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../constants/index.js';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles can access a route.
 * Used together with RolesGuard.
 *
 * @example
 * ```ts
 * @Roles(UserRole.ADMIN, UserRole.MANAGER)
 * @Get('admin/users')
 * getUsers() { ... }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
