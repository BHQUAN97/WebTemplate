import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

/**
 * WebSocket gateway cho notifications real-time.
 *
 * Client connect:
 *   const socket = io('http://host:6001/notifications', { auth: { token } });
 *
 * Server se verify JWT tu handshake.auth.token (hoac query.token),
 * join socket vao room `user:{userId}` va `tenant:{tenantId}` neu co.
 *
 * Service goi emitToUser() / emitToTenant() de push notification.
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    // Origin duoc whitelist tai main.ts cho HTTP; o day cho phep reflect
    // credential cookie/header tu frontend (socket.io tu kiem tra origin).
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('NotificationsGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Verify JWT tu handshake; disconnect neu khong hop le.
   * Thong tin user duoc luu vao client.data.userId + client.data.tenantId.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const rawToken =
        (client.handshake.auth as any)?.token ||
        (client.handshake.query as any)?.token ||
        this.extractBearer(client.handshake.headers?.authorization);

      if (!rawToken || typeof rawToken !== 'string') {
        this.logger.warn(`Socket ${client.id} connect rejected: no token`);
        client.disconnect(true);
        return;
      }

      const secret = this.configService.get<string>('jwt.accessSecret');
      if (!secret) {
        this.logger.error('jwt.accessSecret not configured');
        client.disconnect(true);
        return;
      }

      const payload: any = this.jwtService.verify(rawToken, { secret });
      const userId = payload.sub;
      const tenantId = payload.tenantId || payload.tenant_id;

      client.data.userId = userId;
      client.data.tenantId = tenantId;

      // Join rooms — cho phep emit theo user hoac tenant
      await client.join(`user:${userId}`);
      if (tenantId) {
        await client.join(`tenant:${tenantId}`);
      }

      this.logger.log(
        `Socket connected: ${client.id} user=${userId} tenant=${tenantId || '-'}`,
      );
    } catch (err) {
      this.logger.warn(
        `Socket ${client.id} connect rejected: ${(err as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  /**
   * Log khi socket ngat — socket.io tu cleanup rooms.
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(
      `Socket disconnected: ${client.id} user=${client.data?.userId || '-'}`,
    );
  }

  /**
   * Emit event toi 1 user (tat ca socket cua user do deu nhan).
   */
  emitToUser(userId: string, event: string, data: any): void {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit event toi toan bo tenant — broadcast.
   */
  emitToTenant(tenantId: string, event: string, data: any): void {
    if (!this.server) return;
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  /**
   * Emit global — tat ca socket trong namespace.
   */
  emitToAll(event: string, data: any): void {
    if (!this.server) return;
    this.server.emit(event, data);
  }

  /**
   * Extract "Bearer <token>" tu Authorization header.
   */
  private extractBearer(header?: string): string | null {
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token.trim();
  }
}
