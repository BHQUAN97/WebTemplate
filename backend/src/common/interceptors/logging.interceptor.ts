import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Interceptor that logs HTTP request details: method, URL, duration, status, user.
 * Useful for access logs and performance monitoring.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || '-';
    const userId = (request as any).user?.id || 'anonymous';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const duration = Date.now() - startTime;

          this.logger.log(
            `${method} ${originalUrl} ${response.statusCode} ${duration}ms | user:${userId} ip:${ip} ua:${userAgent}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const status = error.status || 500;

          this.logger.warn(
            `${method} ${originalUrl} ${status} ${duration}ms | user:${userId} ip:${ip} err:${error.message}`,
          );
        },
      }),
    );
  }
}
