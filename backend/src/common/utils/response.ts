/**
 * Metadata for paginated responses.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standard API response wrapper used across all endpoints.
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  pagination?: PaginationMeta;
}

/**
 * Create a success response.
 *
 * @param data - Response payload
 * @param message - Optional success message
 */
export function successResponse<T>(
  data: T,
  message = 'Success',
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Create a paginated success response.
 *
 * @param data - Array of items for current page
 * @param meta - Pagination metadata
 * @param message - Optional success message
 */
export function paginatedResponse<T>(
  data: T[],
  meta: PaginationMeta,
  message = 'Success',
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    message,
    pagination: meta,
  };
}

/**
 * Create an error response.
 *
 * @param message - Error description
 * @param data - Optional error details
 */
export function errorResponse(
  message: string,
  data: any = null,
): ApiResponse<null> {
  return {
    success: false,
    data,
    message,
  };
}
