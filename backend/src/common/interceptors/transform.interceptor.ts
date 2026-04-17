import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../utils/response.js';

/**
 * Interceptor that wraps all successful responses in the standard ApiResponse format.
 * If the response already has `success` property, it passes through unchanged.
 *
 * Applied globally to ensure consistent response shape.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Response da dung format ApiResponse → khong wrap lai
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        return {
          success: true,
          data,
          message: 'Success',
        };
      }),
    );
  }
}
