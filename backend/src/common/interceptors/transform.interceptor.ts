import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Readable } from 'stream';
import { ApiResponse } from '../utils/response.js';

/**
 * Interceptor that wraps all successful responses in the standard ApiResponse format.
 * If the response already has `success` property, it passes through unchanged.
 *
 * Pass-through cho Stream/Buffer/StreamableFile — KHONG wrap binary response
 * (file download, image preview, GDPR ZIP) vi map() se JSON.stringify binary
 * data → corrupt file.
 *
 * Pass-through neu controller dung @Res() (response.headersSent / direct response).
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const res = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data) => {
        // Controller da dung @Res() truc tiep (vd file download): bo qua
        if (res?.headersSent) {
          return data;
        }

        // Binary/stream response: KHONG wrap (tranh JSON.stringify Buffer/Stream)
        if (
          data instanceof StreamableFile ||
          data instanceof Readable ||
          Buffer.isBuffer(data) ||
          (data && typeof (data as any).pipe === 'function')
        ) {
          return data;
        }

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
