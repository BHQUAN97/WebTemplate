import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Brackets } from 'typeorm';
import { Conversation } from './entities/conversation.entity.js';
import { ChatMessage } from './entities/chat-message.entity.js';
import { ChatSchedule } from './entities/chat-schedule.entity.js';
import { StartConversationDto } from './dto/start-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { CloseConversationDto } from './dto/close-conversation.dto.js';
import { ListConversationsQueryDto } from './dto/list-conversations-query.dto.js';
import {
  CHAT_EVENTS,
  ConversationStatus,
  MessageRole,
  MessageType,
  ScheduleMode,
} from './chat.constants.js';
import { PaginationMeta } from '../../common/utils/response.js';
import { AiService } from './ai/ai.service.js';
import { ChatGateway } from './chat.gateway.js';

/**
 * Sender info truyen vao khi insert message — phan biet customer vs agent vs AI.
 */
export interface MessageSender {
  role: MessageRole;
  id?: string;
  name?: string;
}

/**
 * Params paginate list messages trong 1 conversation.
 */
export interface ListMessagesOptions {
  before?: Date | string;
  limit?: number;
}

/**
 * ChatService — core logic quan ly conversation + message.
 * Chua CRUD day du; cac method AI-related duoc mark STUB de wave-2 agent fill.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(ChatSchedule)
    private readonly scheduleRepo: Repository<ChatSchedule>,
    private readonly aiService: AiService,
    // forwardRef tranh circular dep: ChatGateway inject ChatService, ChatService inject ChatGateway
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Tao conversation moi — neu co `initialMessage` thi insert message dau tien
   * va update lastMessageAt/Preview.
   */
  async startConversation(dto: StartConversationDto): Promise<Conversation> {
    const conversation = this.conversationRepo.create({
      channel: dto.channel,
      status: ConversationStatus.OPEN,
      mode: ScheduleMode.AI,
      subject: dto.subject ?? null,
      customerName: dto.customerName ?? null,
      customerEmail: dto.customerEmail ?? null,
      customerPhone: dto.customerPhone ?? null,
      metadata: dto.metadata ?? null,
      unreadByAgent: 0,
      unreadByCustomer: 0,
    });

    const saved = await this.conversationRepo.save(conversation);

    // Neu co initialMessage — insert luon va update preview
    if (dto.initialMessage) {
      await this.insertMessage(saved, dto.initialMessage, MessageType.TEXT, {
        role: MessageRole.USER,
        name: dto.customerName ?? undefined,
      });
    }

    this.logger.log(`Started conversation ${saved.id} channel=${saved.channel}`);
    return this.conversationRepo.findOneByOrFail({ id: saved.id });
  }

  /**
   * Gui message tu customer / agent — tao message + update conversation preview/counter.
   */
  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    sender: MessageSender,
  ): Promise<ChatMessage> {
    const conversation = await this.getConversationOrFail(conversationId);
    return this.insertMessage(
      conversation,
      dto.content,
      dto.type ?? MessageType.TEXT,
      sender,
      dto.attachments ?? null,
    );
  }

  /**
   * Shared helper — tao ChatMessage + update Conversation counters/preview.
   * Tach rieng de startConversation va sendMessage dung chung.
   */
  private async insertMessage(
    conversation: Conversation,
    content: string,
    type: MessageType,
    sender: MessageSender,
    attachments: any[] | null = null,
  ): Promise<ChatMessage> {
    const message = this.messageRepo.create({
      conversationId: conversation.id,
      role: sender.role,
      type,
      content,
      senderId: sender.id ?? null,
      senderName: sender.name ?? null,
      attachments: attachments as any,
    });
    const savedMessage = await this.messageRepo.save(message);

    // Update conversation state — preview, timestamp, unread counter
    const preview = content.slice(0, 200);
    const patch: Partial<Conversation> = {
      lastMessageAt: savedMessage.created_at ?? new Date(),
      lastMessagePreview: preview,
    };

    // Tang unread counter theo role — khi customer gui, agent chua doc
    if (sender.role === MessageRole.USER) {
      patch.unreadByAgent = (conversation.unreadByAgent ?? 0) + 1;
    } else if (
      sender.role === MessageRole.AI ||
      sender.role === MessageRole.AGENT
    ) {
      patch.unreadByCustomer = (conversation.unreadByCustomer ?? 0) + 1;
    }

    await this.conversationRepo.update({ id: conversation.id }, patch);
    return savedMessage;
  }

  /**
   * Lay conversation kem 50 messages moi nhat.
   */
  async getConversation(id: string): Promise<Conversation> {
    const conv = await this.conversationRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!conv) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    // Load messages rieng de order DESC va limit 50
    const messages = await this.messageRepo.find({
      where: { conversationId: id },
      order: { created_at: 'DESC' },
      take: 50,
    });
    // Tra ve theo chieu ASC cho client render
    conv.messages = messages.reverse();
    return conv;
  }

  /**
   * Admin list conversations — filter theo status/mode/agent/channel/date + search.
   */
  async listConversations(query: ListConversationsQueryDto): Promise<{
    items: Conversation[];
    meta: PaginationMeta;
  }> {
    const { page = 1, limit = 20, search, sort, order } = query;
    const skip = (page - 1) * limit;
    const sortField = sort || 'lastMessageAt';
    const sortOrder = order || 'DESC';

    const qb = this.conversationRepo
      .createQueryBuilder('entity')
      .where('entity.deleted_at IS NULL');

    if (query.status) {
      qb.andWhere('entity.status = :status', { status: query.status });
    }
    if (query.mode) {
      qb.andWhere('entity.mode = :mode', { mode: query.mode });
    }
    if (query.agentId) {
      qb.andWhere('entity.agentId = :agentId', { agentId: query.agentId });
    }
    if (query.channel) {
      qb.andWhere('entity.channel = :channel', { channel: query.channel });
    }
    if (query.from) {
      qb.andWhere('entity.lastMessageAt >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('entity.lastMessageAt <= :to', { to: query.to });
    }
    if (search) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('entity.customerName LIKE :s', { s: `%${search}%` })
            .orWhere('entity.customerEmail LIKE :s', { s: `%${search}%` })
            .orWhere('entity.subject LIKE :s', { s: `%${search}%` })
            .orWhere('entity.lastMessagePreview LIKE :s', {
              s: `%${search}%`,
            });
        }),
      );
    }

    qb.orderBy(`entity.${sortField}`, sortOrder).skip(skip).take(limit);
    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * List messages trong conversation — ho tro cursor `before` de paginate len tren.
   */
  async listMessages(
    conversationId: string,
    options: ListMessagesOptions = {},
  ): Promise<ChatMessage[]> {
    const limit = options.limit ?? 50;
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .where('m.conversationId = :id', { id: conversationId });

    if (options.before) {
      qb.andWhere('m.created_at < :before', { before: options.before });
    }
    const items = await qb
      .orderBy('m.created_at', 'DESC')
      .take(limit)
      .getMany();
    // Client expect ASC order
    return items.reverse();
  }

  /**
   * Gan agent xu ly conversation — chuyen sang HUMAN mode + WITH_AGENT status.
   */
  async assignAgent(
    conversationId: string,
    agentId: string,
  ): Promise<Conversation> {
    const conv = await this.getConversationOrFail(conversationId);
    conv.agentId = agentId;
    conv.mode = ScheduleMode.HUMAN;
    conv.status = ConversationStatus.WITH_AGENT;
    const saved = await this.conversationRepo.save(conv);
    this.logger.log(`Assigned agent ${agentId} to conversation ${conversationId}`);
    return saved;
  }

  /**
   * Dong conversation — luu rating/feedback neu co.
   */
  async closeConversation(
    id: string,
    dto: CloseConversationDto,
  ): Promise<Conversation> {
    const conv = await this.getConversationOrFail(id);
    conv.status = ConversationStatus.CLOSED;
    if (dto.rating !== undefined) conv.rating = dto.rating;
    if (dto.feedback !== undefined) conv.feedback = dto.feedback;
    const saved = await this.conversationRepo.save(conv);
    this.logger.log(`Closed conversation ${id}`);
    return saved;
  }

  /**
   * Reset unread counter cho 1 ben — va stamp readAt tren messages chua doc
   * cua ben doi dien.
   */
  async markAsRead(
    conversationId: string,
    by: 'agent' | 'customer',
  ): Promise<void> {
    const patch: Partial<Conversation> =
      by === 'agent' ? { unreadByAgent: 0 } : { unreadByCustomer: 0 };
    await this.conversationRepo.update({ id: conversationId }, patch);

    // Mark readAt cho message cua ben kia
    const otherRoles =
      by === 'agent'
        ? [MessageRole.USER]
        : [MessageRole.AI, MessageRole.AGENT, MessageRole.SYSTEM];

    await this.messageRepo
      .createQueryBuilder()
      .update(ChatMessage)
      .set({ readAt: new Date() })
      .where('conversationId = :cid', { cid: conversationId })
      .andWhere('role IN (:...roles)', { roles: otherRoles })
      .andWhere('readAt IS NULL')
      .execute();
  }

  /**
   * Quyet dinh mode hien tai cua chat dua tren ChatSchedule.
   * - Lay gio hien tai theo Asia/Ho_Chi_Minh
   * - Match cac schedule isActive, khop dayOfWeek (hoac null) va trong khoang time
   * - Chon schedule co priority cao nhat
   * - Fallback OFFLINE neu khong co schedule nao khop
   */
  async getCurrentMode(): Promise<ScheduleMode> {
    const schedules = await this.scheduleRepo.find({
      where: { isActive: true, deleted_at: IsNull() },
    });
    if (schedules.length === 0) return ScheduleMode.OFFLINE;

    // Format gio hien tai theo Asia/Ho_Chi_Minh
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = fmt.formatToParts(now);
    const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const currentTime = `${hour}:${minute}`;

    // Map weekday string -> 0..6 (0=Sunday)
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const currentDay = weekdayMap[weekdayStr] ?? 1;

    // Filter + pick highest priority
    const matching = schedules.filter((s) => {
      if (s.dayOfWeek !== null && s.dayOfWeek !== currentDay) return false;
      return currentTime >= s.startTime && currentTime <= s.endTime;
    });

    if (matching.length === 0) return ScheduleMode.OFFLINE;

    matching.sort((a, b) => b.priority - a.priority);
    return matching[0].mode;
  }

  /**
   * Trigger AI reply cho conversation — orchestrate full AI reply pipeline:
   *  - Skip neu conv closed hoac dang o HUMAN mode
   *  - Emit typing indicator
   *  - Delay 1.2s de giong nguoi that
   *  - Goi AiService.generateReply()
   *  - Insert AI message + save metadata (tokens, toolCalls, scenarioId)
   *  - Emit qua gateway
   *  - Fallback system message + chuyen WAITING_AGENT khi loi
   */
  async triggerAiReply(conversationId: string): Promise<void> {
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conv) return;
    if (conv.status === ConversationStatus.CLOSED) return;
    // HUMAN mode: nhan vien xu ly, khong AI tu tra loi
    if (conv.mode === ScheduleMode.HUMAN) return;

    try {
      // Bat typing indicator — FE hien cham cham "AI dang go..."
      this.safeEmitConversationUpdated(conversationId, {
        aiTyping: true,
      });

      // Artificial delay 1.2s de giong nguoi that (tranh reply tuc thoi)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const reply = await this.aiService.generateReply(conversationId);

      // AiService hien tai return string (stub), wave-2 se return {content, metadata}
      // Defensive: support ca 2 hinh thuc
      const content =
        typeof reply === 'string'
          ? reply
          : ((reply as any)?.content ?? '');
      const metadata =
        typeof reply === 'string' ? null : ((reply as any)?.metadata ?? null);

      if (!content) {
        this.logger.warn(
          `AI generateReply returned empty content for ${conversationId}`,
        );
        return;
      }

      // Insert AI message qua sendMessage de share logic unread/preview
      const msg = await this.sendMessage(
        conversationId,
        { content, type: MessageType.TEXT },
        { role: MessageRole.AI, name: 'AI Assistant' },
      );

      // Gan metadata (tokens, toolCalls, sourceScenarioId) neu co
      if (metadata) {
        msg.metadata = metadata;
        await this.messageRepo.save(msg);
      }

      // Tat typing + emit message
      this.safeEmitConversationUpdated(conversationId, { aiTyping: false });
      this.safeEmitMessage(conversationId, msg);
    } catch (err) {
      this.logger.error(
        `AI reply failed for ${conversationId}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      // Fallback: thong bao khach + chuyen WAITING_AGENT de nhan vien nhay vao
      try {
        await this.sendMessage(
          conversationId,
          {
            content:
              'Shop xin lỗi, hệ thống đang bận. Nhân viên sẽ phản hồi sớm nhất, hoặc bạn vui lòng liên hệ hotline để được hỗ trợ nhé.',
          },
          { role: MessageRole.SYSTEM, name: 'Hệ thống' },
        );
        await this.conversationRepo.update(
          { id: conversationId },
          { status: ConversationStatus.WAITING_AGENT },
        );
        this.safeEmitConversationUpdated(conversationId, {
          aiTyping: false,
          status: ConversationStatus.WAITING_AGENT,
        });
      } catch (fallbackErr) {
        this.logger.error(
          `Fallback message failed for ${conversationId}: ${(fallbackErr as Error).message}`,
        );
      }
    }
  }

  /**
   * Emit message qua gateway — safe wrapper (gateway co the unavailable trong test).
   */
  private safeEmitMessage(conversationId: string, msg: ChatMessage): void {
    try {
      const gw: any = this.chatGateway;
      if (!gw) return;
      // Uu tien emitMessage() (API moi cua gateway), fallback emitToConversation
      if (typeof gw.emitMessage === 'function') {
        gw.emitMessage(conversationId, msg);
      } else if (typeof gw.emitToConversation === 'function') {
        gw.emitToConversation(conversationId, CHAT_EVENTS.MESSAGE_NEW, msg);
      }
    } catch (err) {
      this.logger.warn(
        `emitMessage failed: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Emit conversation updated patch qua gateway — safe wrapper.
   */
  private safeEmitConversationUpdated(
    conversationId: string,
    patch: Record<string, any>,
  ): void {
    try {
      const gw: any = this.chatGateway;
      if (!gw) return;
      if (typeof gw.emitConversationUpdated === 'function') {
        gw.emitConversationUpdated(conversationId, patch);
      } else if (typeof gw.emitToConversation === 'function') {
        gw.emitToConversation(
          conversationId,
          CHAT_EVENTS.CONVERSATION_UPDATED,
          patch,
        );
      }
    } catch (err) {
      this.logger.warn(
        `emitConversationUpdated failed: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Helper: load conversation hoac throw 404.
   */
  private async getConversationOrFail(id: string): Promise<Conversation> {
    const conv = await this.conversationRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!conv) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    return conv;
  }

  /**
   * Internal: repository getter cho phep Gateway / Controller query truc tiep
   * khi can (rare — uu tien dung service methods).
   */
  get conversations(): Repository<Conversation> {
    return this.conversationRepo;
  }
  get messages(): Repository<ChatMessage> {
    return this.messageRepo;
  }
}
