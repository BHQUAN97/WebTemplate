import { forwardRef, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { IsNull, Repository } from 'typeorm';
import { UserRole } from '../../common/constants/index.js';
import { User } from '../users/entities/user.entity.js';
import {
  CHAT_EVENTS,
  ConversationStatus,
  MessageRole,
  ScheduleMode,
} from './chat.constants.js';
import { ChatService } from './chat.service.js';
import { ChatMessage } from './entities/chat-message.entity.js';
import { Conversation } from './entities/conversation.entity.js';

/**
 * Identity context gan vao client.data sau khi authenticate thanh cong.
 * - mode: phan biet 4 loai client connect WS
 * - userId: ULID cua user khi co JWT (customer-user / agent / admin)
 * - conversationId: bat buoc voi customer (guest va user)
 * - role: user.role khi la agent/admin
 */
interface ChatSocketIdentity {
  mode: 'customer-guest' | 'customer-user' | 'agent' | 'admin';
  userId?: string;
  conversationId?: string;
  role?: string;
  displayName?: string;
}

/**
 * Augment client.data de typecheck khi truy cap.
 */
type ChatSocket = Socket & {
  data: ChatSocketIdentity & Record<string, any>;
};

/**
 * Rate limit config — moi socket max 5 msg/s cho 'message:send'.
 */
const MESSAGE_RATE_WINDOW_MS = 1000;
const MESSAGE_RATE_MAX = 5;

/**
 * ChatGateway — real-time chat giua customer (guest/user) va agent/admin.
 *
 * Namespace: `/chat`
 * Auth modes:
 *   1. customer-guest  — { conversationId, customerSessionId } (stored in cookie/localStorage)
 *   2. customer-user   — JWT role=user + conversationId (phai match conversation.customerId)
 *   3. agent           — JWT role=manager (agent)
 *   4. admin           — JWT role=admin
 *
 * Rooms:
 *   - `conversation:{id}` — customer + agent(s) dang subscribe conversation do
 *   - `agents`            — auto-join khi agent/admin connect, nhan broadcast updates
 *
 * Services khac goi helpers public (emitMessage, emitConversationUpdated,
 * emitAgentAssigned) qua DI — khong goi nguoc ChatService tu Gateway
 * ngoai sendMessage + triggerAiReply trong handler.
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  /**
   * In-memory rate limiter cho 'message:send'.
   * Map<socketId, timestamps[]> — cleanup on disconnect.
   */
  private readonly rateTracker = new Map<string, number[]>();

  constructor(
    // forwardRef — ChatService cung inject ChatGateway de emit typing/message
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Lifecycle — goi sau khi Nest gan `server` instance vao gateway.
   */
  afterInit(_server: Server): void {
    this.logger.log('Chat WS ready at /chat');
  }

  /**
   * Handshake authenticate + join room tuong ung voi mode.
   * Disconnect client khi khong hop le — khong leak error chi tiet.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const identity = await this.authenticate(client as ChatSocket);
      (client as ChatSocket).data = {
        ...((client as ChatSocket).data || {}),
        ...identity,
      };

      // Customer (guest + user) auto-join conversation cua minh
      if (identity.mode === 'customer-guest' || identity.mode === 'customer-user') {
        if (!identity.conversationId) {
          throw new WsException('Missing conversationId');
        }
        await client.join(this.roomForConversation(identity.conversationId));
      }

      // Agent/Admin auto-join room 'agents' de nhan broadcasts
      if (identity.mode === 'agent' || identity.mode === 'admin') {
        await client.join('agents');
      }

      this.logger.log(
        `Chat socket connected: ${client.id} mode=${identity.mode}` +
          ` user=${identity.userId ?? '-'} conv=${identity.conversationId ?? '-'}`,
      );
    } catch (err) {
      this.logger.warn(
        `Chat socket ${client.id} rejected: ${(err as Error).message}`,
      );
      // Gui mot error event ngan cho client truoc khi disconnect — client co the hien message
      try {
        client.emit('chat:error', {
          code: 'UNAUTHORIZED',
          message: (err as Error).message || 'Unauthorized',
        });
      } catch {
        // ignore — socket may be already gone
      }
      client.disconnect(true);
    }
  }

  /**
   * Cleanup rate limiter + log.
   * Socket.io tu leave rooms khi disconnect — khong can manual.
   */
  handleDisconnect(client: Socket): void {
    this.rateTracker.delete(client.id);
    this.logger.debug(`Chat socket disconnected: ${client.id}`);
  }

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Agent subscribe vao 1 conversation cu the — join room conversation:{id}.
   * Customer khong duoc goi (chi auto-join tu connect).
   * Sau khi join, broadcast 'agent:joined' toi room de customer biet co nguoi.
   */
  @SubscribeMessage('conversation:subscribe')
  async onSubscribe(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: { conversationId: string },
  ): Promise<{ ok: boolean }> {
    this.assertAgent(client);
    if (!data?.conversationId) {
      throw new WsException('conversationId required');
    }
    const room = this.roomForConversation(data.conversationId);
    await client.join(room);
    // Notify conversation members — vd customer thay agent da join
    client.to(room).emit('agent:joined', {
      conversationId: data.conversationId,
      agentId: client.data.userId,
      agentName: client.data.displayName,
    });
    return { ok: true };
  }

  /**
   * Agent unsubscribe — leave room conversation:{id}.
   */
  @SubscribeMessage('conversation:unsubscribe')
  async onUnsubscribe(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: { conversationId: string },
  ): Promise<{ ok: boolean }> {
    this.assertAgent(client);
    if (!data?.conversationId) {
      throw new WsException('conversationId required');
    }
    await client.leave(this.roomForConversation(data.conversationId));
    return { ok: true };
  }

  /**
   * Client gui message — customer hoac agent. Resolve sender tu client.data.
   * Rate-limit 5 msg/s per socket.
   * Neu sender=customer + mode=AI, fire-and-forget triggerAiReply().
   */
  @SubscribeMessage('message:send')
  async onMessageSend(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody()
    data: { conversationId: string; content: string; type?: string },
  ): Promise<void> {
    // Rate limit TRUOC khi cham DB
    if (!this.checkRateLimit(client.id)) {
      client.emit('chat:error', {
        code: 'RATE_LIMITED',
        message: 'Gui qua nhanh, doi mot chut',
      });
      return;
    }

    if (!data?.conversationId || !data?.content?.trim()) {
      throw new WsException('conversationId + content required');
    }

    // Verify quyen gui trong conversation nay
    await this.assertCanSend(client, data.conversationId);

    // Resolve sender info tu client.data
    const sender = this.resolveSender(client);

    // Delegate toi ChatService — se insert message + update conversation counters
    const message = await this.chatService.sendMessage(
      data.conversationId,
      { content: data.content, type: data.type as any },
      sender,
    );

    // Broadcast toi room conversation — bao gom customer + subscribed agents
    this.emitMessage(data.conversationId, message);

    // Neu customer gui va conversation dang o AI mode -> trigger AI reply (fire-and-forget)
    if (sender.role === MessageRole.USER) {
      const conv = await this.conversationRepo.findOne({
        where: { id: data.conversationId, deleted_at: IsNull() },
      });
      if (conv?.mode === ScheduleMode.AI || conv?.mode === ScheduleMode.HYBRID) {
        this.chatService.triggerAiReply(data.conversationId).catch((err) => {
          this.logger.warn(
            `triggerAiReply failed for ${data.conversationId}: ${(err as Error).message}`,
          );
        });
      }
    }
  }

  /**
   * Typing indicator — broadcast toi room (tru sender).
   */
  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ): void {
    if (!data?.conversationId) return;
    client.to(this.roomForConversation(data.conversationId)).emit(
      CHAT_EVENTS.TYPING,
      {
        from: client.data.role ?? client.data.mode,
        userId: client.data.userId,
        isTyping: !!data.isTyping,
      },
    );
  }

  /**
   * Agent query top 20 conversation dang waiting (waiting_agent hoac with_agent).
   * Dung khi agent mo dashboard — load queue.
   */
  @SubscribeMessage('agent:list-active')
  async onListActive(
    @ConnectedSocket() client: ChatSocket,
  ): Promise<Conversation[]> {
    this.assertAgent(client);
    const items = await this.conversationRepo.find({
      where: [
        { status: ConversationStatus.WAITING_AGENT, deleted_at: IsNull() },
        { status: ConversationStatus.WITH_AGENT, deleted_at: IsNull() },
        { status: ConversationStatus.OPEN, deleted_at: IsNull() },
      ],
      order: { lastMessageAt: 'DESC' },
      take: 20,
    });
    return items;
  }

  // ==========================================================================
  // PUBLIC HELPERS — services khac inject gateway de goi
  // ==========================================================================

  /**
   * Phat message moi toi tat ca socket trong room conversation (customer + agents).
   */
  emitMessage(conversationId: string, message: ChatMessage): void {
    if (!this.server) return;
    this.server
      .to(this.roomForConversation(conversationId))
      .emit(CHAT_EVENTS.MESSAGE_NEW, message);
  }

  /**
   * Bao conversation vua duoc update (assign, close, mode change...) — gui ca
   * toi room conversation va toi room agents de dashboard refresh.
   */
  emitConversationUpdated(
    conversationId: string,
    patch: Partial<Conversation>,
  ): void {
    if (!this.server) return;
    const payload = { id: conversationId, ...patch };
    this.server
      .to(this.roomForConversation(conversationId))
      .emit(CHAT_EVENTS.CONVERSATION_UPDATED, payload);
    this.server.to('agents').emit(CHAT_EVENTS.CONVERSATION_UPDATED, payload);
  }

  /**
   * Notify customer + agents khi co agent moi duoc assign vao conversation.
   */
  emitAgentAssigned(
    conversationId: string,
    agentId: string,
    agentName: string,
  ): void {
    if (!this.server) return;
    this.server
      .to(this.roomForConversation(conversationId))
      .emit(CHAT_EVENTS.AGENT_ASSIGNED, { agentId, agentName });
    this.server
      .to('agents')
      .emit(CHAT_EVENTS.AGENT_ASSIGNED, { conversationId, agentId, agentName });
  }

  // ==========================================================================
  // PRIVATE — auth, rate limit, helpers
  // ==========================================================================

  /**
   * Authenticate handshake — thu JWT truoc, khong co thi thu customer session.
   * Throw WsException neu khong mode nao hop le.
   */
  private async authenticate(client: Socket): Promise<ChatSocketIdentity> {
    const auth: any = client.handshake.auth || {};
    const query: any = client.handshake.query || {};

    const rawToken =
      auth.token ||
      query.token ||
      this.extractBearer(client.handshake.headers?.authorization);
    const conversationId: string | undefined =
      auth.conversationId || query.conversationId;
    const customerSessionId: string | undefined =
      auth.customerSessionId || query.customerSessionId;

    // Mode 2/3/4: JWT present — verify + fetch user de biet role
    if (rawToken && typeof rawToken === 'string') {
      const user = await this.verifyJwtAndLoadUser(rawToken);

      // Agent/admin — role manager hoac admin
      if (user.role === UserRole.ADMIN) {
        return {
          mode: 'admin',
          userId: user.id,
          role: user.role,
          displayName: user.name ?? user.email,
        };
      }
      if (user.role === UserRole.MANAGER) {
        return {
          mode: 'agent',
          userId: user.id,
          role: user.role,
          displayName: user.name ?? user.email,
        };
      }

      // Customer user — role=user, phai kem conversationId va conversation.customerId phai match
      if (user.role === UserRole.USER || user.role === UserRole.EDITOR) {
        if (!conversationId) {
          throw new WsException('conversationId required for customer user');
        }
        const conv = await this.conversationRepo.findOne({
          where: { id: conversationId, deleted_at: IsNull() },
        });
        if (!conv) {
          throw new WsException('Conversation not found');
        }
        if (conv.customerId && conv.customerId !== user.id) {
          throw new WsException('Conversation does not belong to this user');
        }
        return {
          mode: 'customer-user',
          userId: user.id,
          conversationId,
          role: user.role,
          displayName: user.name ?? user.email,
        };
      }

      throw new WsException('Unsupported user role');
    }

    // Mode 1: guest — can conversationId + customerSessionId
    if (conversationId && customerSessionId) {
      const conv = await this.conversationRepo.findOne({
        where: { id: conversationId, deleted_at: IsNull() },
      });
      if (!conv) {
        throw new WsException('Conversation not found');
      }
      const storedSession = conv.metadata?.customerSessionId;
      if (!storedSession) {
        // Chua co session — set lan dau de lock conversation vao client nay
        await this.conversationRepo.update(
          { id: conversationId },
          {
            metadata: {
              ...(conv.metadata ?? {}),
              customerSessionId,
            } as any,
          },
        );
      } else if (storedSession !== customerSessionId) {
        throw new WsException('Invalid customer session');
      }
      return {
        mode: 'customer-guest',
        conversationId,
        displayName: conv.customerName ?? 'Guest',
      };
    }

    throw new WsException('Unauthorized');
  }

  /**
   * Verify JWT access token + fetch user (check active/soft-delete).
   */
  private async verifyJwtAndLoadUser(token: string): Promise<User> {
    const secret = this.configService.get<string>('jwt.accessSecret');
    if (!secret) {
      throw new WsException('Server misconfigured');
    }
    let payload: any;
    try {
      payload = this.jwtService.verify(token, { secret });
    } catch {
      throw new WsException('Invalid token');
    }
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || user.deleted_at !== null || !user.is_active) {
      throw new WsException('User not found or inactive');
    }
    return user;
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

  /**
   * Verify client la agent/admin — throw WsException neu khong.
   */
  private assertAgent(client: ChatSocket): void {
    if (client.data.mode !== 'agent' && client.data.mode !== 'admin') {
      throw new WsException('Agent or admin role required');
    }
  }

  /**
   * Verify client co quyen gui message trong conversation nay:
   * - Agent/admin: luon cho phep (co the reply bat ky conversation nao)
   * - Customer: conversationId phai trung voi client.data.conversationId
   */
  private async assertCanSend(
    client: ChatSocket,
    conversationId: string,
  ): Promise<void> {
    const { mode } = client.data;
    if (mode === 'agent' || mode === 'admin') return;
    if (client.data.conversationId !== conversationId) {
      throw new WsException('Cannot send to this conversation');
    }
  }

  /**
   * Xay dung MessageSender tu client.data.
   */
  private resolveSender(client: ChatSocket): {
    role: MessageRole;
    id?: string;
    name?: string;
  } {
    if (client.data.mode === 'agent' || client.data.mode === 'admin') {
      return {
        role: MessageRole.AGENT,
        id: client.data.userId,
        name: client.data.displayName,
      };
    }
    // customer-guest + customer-user
    return {
      role: MessageRole.USER,
      id: client.data.userId,
      name: client.data.displayName,
    };
  }

  /**
   * Rate limiter in-memory: max MESSAGE_RATE_MAX moi MESSAGE_RATE_WINDOW_MS.
   * Return false neu vuot.
   */
  private checkRateLimit(socketId: string): boolean {
    const now = Date.now();
    const windowStart = now - MESSAGE_RATE_WINDOW_MS;
    const timestamps = this.rateTracker.get(socketId) ?? [];
    // Giu lai cac timestamps trong window hien tai
    const recent = timestamps.filter((t) => t > windowStart);
    if (recent.length >= MESSAGE_RATE_MAX) {
      this.rateTracker.set(socketId, recent);
      return false;
    }
    recent.push(now);
    this.rateTracker.set(socketId, recent);
    return true;
  }

  /**
   * Room name convention cho 1 conversation.
   */
  private roomForConversation(conversationId: string): string {
    return `conversation:${conversationId}`;
  }
}
