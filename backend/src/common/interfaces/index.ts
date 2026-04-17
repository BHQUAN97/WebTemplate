import { UserRole } from '../constants/index.js';

/**
 * Current authenticated user extracted from JWT token.
 * Attached to request by JwtAuthGuard.
 */
export interface ICurrentUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId?: string;
}

/**
 * Pagination options for list queries.
 */
export interface IPaginationOptions {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

/**
 * Per-module configuration for enabling/disabling features.
 */
export interface IModuleConfig {
  enabled: boolean;
  [key: string]: any;
}
