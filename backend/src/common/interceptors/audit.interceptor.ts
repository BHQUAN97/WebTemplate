import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service.js';

/**
 * Interceptor tu dong ghi audit log cho cac request mutate (POST/PUT/PATCH/DELETE).
 *
 * KHONG duoc apply global — chi gan cho module/controller nao can:
 *
 * @example
 * // Apply cho toan bo controller:
 * ```ts
 * import { UseInterceptors } from '@nestjs/common';
 * import { AuditInterceptor } from 'src/common/interceptors/audit.interceptor.js';
 *
 * @UseInterceptors(AuditInterceptor)
 * @Controller('users')
 * export class UsersController { ... }
 * ```
 *
 * Hoac cho tung route:
 * ```ts
 * @UseInterceptors(AuditInterceptor)
 * @Patch(':id')
 * update(...) { ... }
 * ```
 *
 * Khi gan cho module, phai import `AuditLogsModule` de DI co the resolve `AuditLogsService`.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditInterceptor');

  /** Paths bi skip — tranh noise tu health check, auth flows, refresh token */
  private readonly skipPaths = ['/health', '/auth/login', '/auth/refresh'];

  /** HTTP methods can audit */
  private readonly auditMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * Xu ly request: kiem tra method + path, neu khop thi ghi log SAU khi handler xong.
   * Khong block request — dung tap() o successful response.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = request;

    // Skip neu khong phai mutate method hoac path bi blacklist
    if (!this.auditMethods.includes(method)) {
      return next.handle();
    }
    const pathWithoutPrefix = originalUrl.replace(/^\/api/, '');
    if (this.skipPaths.some((p) => pathWithoutPrefix.startsWith(p))) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (data) => this.writeLog(request, data, context),
      }),
    );
  }

  /**
   * Tao audit log entry tu request + response data.
   * Chay async, khong await de khong lam cham response.
   * Bao gom user_id (neu auth), IP, user-agent va body request.
   */
  private writeLog(
    request: Request,
    responseData: any,
    context: ExecutionContext,
  ): void {
    try {
      const user = (request as any).user;
      const userId: string | null = user?.id || null;

      // Lay resource type tu controller class name (boVO 'Controller' suffix)
      const controllerClass = context.getClass().name;
      const resourceType = controllerClass.replace(/Controller$/, '');

      // Resource ID: uu tien tu response, fallback params.id
      const resourceId =
        responseData?.data?.id ||
        responseData?.id ||
        request.params?.id ||
        null;

      // Tao action name theo format: METHOD /path
      const action = `${request.method} ${request.originalUrl.replace(/^\/api/, '')}`;

      // Body co the chua password — loai bo truoc khi luu
      const safeBody = this.sanitize(request.body);

      void this.auditLogsService.log({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id:
          typeof resourceId === 'string'
            ? resourceId
            : String(resourceId ?? ''),
        changes: safeBody,
        ip_address: request.ip || request.socket?.remoteAddress || null,
        user_agent: request.get('user-agent') || null,
      });
    } catch (err) {
      this.logger.warn(`Audit log failed: ${(err as Error).message}`);
    }
  }

  /**
   * Xoa cac field nhay cam khoi body truoc khi ghi audit log.
   * Recursive — xu ly nested objects (vd metadata.token, profile.password).
   * Cap do depth = 5 de tranh stack overflow voi circular structure.
   */
  private sanitize(body: any, depth = 0): any {
    if (depth > 5) return '[TRUNCATED]';
    if (body === null || body === undefined) return null;
    if (typeof body !== 'object') return body;

    const sensitive = [
      'password',
      'old_password',
      'new_password',
      'currentpassword',
      'newpassword',
      'confirmpassword',
      'token',
      'refresh_token',
      'access_token',
      'refreshtoken',
      'accesstoken',
      'secret',
      'apikey',
      'api_key',
      'otp',
      'totp',
      'backup_code',
      'private_key',
    ];

    if (Array.isArray(body)) {
      return body.map((v) => this.sanitize(v, depth + 1));
    }

    const copy: Record<string, any> = {};
    for (const k of Object.keys(body)) {
      const lk = k.toLowerCase();
      if (sensitive.some((s) => lk.includes(s))) {
        copy[k] = '[REDACTED]';
      } else if (body[k] && typeof body[k] === 'object') {
        copy[k] = this.sanitize(body[k], depth + 1);
      } else {
        copy[k] = body[k];
      }
    }
    return copy;
  }
}
