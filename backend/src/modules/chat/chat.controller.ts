import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Logger,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ulid } from 'ulid';
import { ChatService } from './chat.service.js';
import { StartConversationDto } from './dto/start-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { AssignAgentDto } from './dto/assign-agent.dto.js';
import { CloseConversationDto } from './dto/close-conversation.dto.js';
import { ListConversationsQueryDto } from './dto/list-conversations-query.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';
import { MessageRole, ScheduleMode } from './chat.constants.js';

/**
 * ChatController — gom ca public customer routes va admin /admin routes.
 *
 * Public routes: customer widget — start conversation, send message, fetch history.
 * Admin routes: agent/admin quan ly conversation — list, assign, close, read.
 */
@Controller()
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  // ==========================================================================
  // PUBLIC — customer facing
  // ==========================================================================

  /**
   * Khoi tao conversation moi — public, co the la guest.
   * Rate-limit chat de tranh spam tu 1 IP.
   * Generate `customerSessionId` (ULID) luu vao metadata + return de FE store
   * va truyen qua header x-customer-session-id o cac request sau.
   */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('chat/conversations')
  async startConversation(@Body() dto: StartConversationDto) {
    // Gen session id + merge vao metadata truoc khi insert — gan guest voi 1 session
    const customerSessionId = ulid();
    const dtoWithSession: StartConversationDto = {
      ...dto,
      metadata: { ...(dto.metadata ?? {}), customerSessionId } as any,
    };
    const conv = await this.chatService.startConversation(dtoWithSession);
    return successResponse(
      { ...conv, customerSessionId },
      'Conversation started',
    );
  }

  /**
   * Helper: verify customer session header khop voi conversation.
   * Chi run cho public routes — admin co @Roles se bypass.
   * Throw ForbiddenException neu session khong match va user khong phai admin.
   */
  private async assertCustomerSession(
    conversationId: string,
    sessionHeader: string | undefined,
  ): Promise<void> {
    const conv = await this.chatService.conversations.findOne({
      where: { id: conversationId },
    });
    if (!conv) return; // de service handle 404
    const storedSession = conv.metadata?.customerSessionId;
    // Neu conversation chua co session luu → yeu cau phai co header match sau nay
    if (!storedSession) {
      // Legacy conv khong co session — cho phep (backward compat).
      return;
    }
    if (!sessionHeader || sessionHeader !== storedSession) {
      throw new ForbiddenException(
        'Customer session invalid or missing',
      );
    }
  }

  /**
   * Customer gui message — sau khi luu, neu currentMode la AI thi trigger AI reply
   * (best-effort, khong fail request neu AI loi).
   */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Post('chat/conversations/:id/messages')
  async sendCustomerMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Headers('x-customer-session-id') sessionId?: string,
  ) {
    // Verify customer session — chan cross-guest spoofing
    await this.assertCustomerSession(id, sessionId);

    const message = await this.chatService.sendMessage(id, dto, {
      role: MessageRole.USER,
    });

    // Kiem tra mode — neu AI thi goi triggerAiReply (try/catch, khong fail user)
    try {
      const mode = await this.chatService.getCurrentMode();
      if (mode === ScheduleMode.AI || mode === ScheduleMode.HYBRID) {
        // fire-and-forget — wave-2 AI agent se implement
        this.chatService.triggerAiReply(id).catch((err) => {
          this.logger.warn(
            `triggerAiReply failed for ${id}: ${(err as Error).message}`,
          );
        });
      }
    } catch (err) {
      this.logger.warn(
        `getCurrentMode failed for ${id}: ${(err as Error).message}`,
      );
    }

    return successResponse(message, 'Message sent');
  }

  /**
   * Lay chi tiet conversation — public, phai co x-customer-session-id match.
   * Admin route rieng o duoi (roles guard bypass).
   */
  @Public()
  @Get('chat/conversations/:id')
  async getConversation(
    @Param('id') id: string,
    @Headers('x-customer-session-id') sessionId?: string,
  ) {
    await this.assertCustomerSession(id, sessionId);
    const conv = await this.chatService.getConversation(id);
    return successResponse(conv);
  }

  /**
   * Lay danh sach messages cua conversation — public, session-scoped.
   */
  @Public()
  @Get('chat/conversations/:id/messages')
  async getConversationMessages(
    @Param('id') id: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
    @Headers('x-customer-session-id') sessionId?: string,
  ) {
    await this.assertCustomerSession(id, sessionId);
    const items = await this.chatService.listMessages(id, {
      before,
      limit: limit ? Number(limit) : undefined,
    });
    return successResponse(items);
  }

  // ==========================================================================
  // ADMIN — agent / admin
  // ==========================================================================

  /**
   * Admin list conversations — filter + pagination.
   */
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/chat/conversations')
  async listConversations(@Query() query: ListConversationsQueryDto) {
    const { items, meta } = await this.chatService.listConversations(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Admin lay chi tiet 1 conversation.
   */
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/chat/conversations/:id')
  async adminGetConversation(@Param('id') id: string) {
    const conv = await this.chatService.getConversation(id);
    return successResponse(conv);
  }

  /**
   * Agent gui message cho khach — role=AGENT, sender info tu JWT.
   */
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('admin/chat/conversations/:id/messages')
  async agentSendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const message = await this.chatService.sendMessage(id, dto, {
      role: MessageRole.AGENT,
      id: user.id,
      name: user.email, // wave-2 agent co the swap sang displayName
    });
    return successResponse(message, 'Message sent');
  }

  /**
   * Admin gan agent vao conversation.
   */
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch('admin/chat/conversations/:id/assign')
  async assign(@Param('id') id: string, @Body() dto: AssignAgentDto) {
    const conv = await this.chatService.assignAgent(id, dto.agentId);
    return successResponse(conv, 'Agent assigned');
  }

  /**
   * Admin dong conversation — co the kem rating/feedback (vd import tu ben ngoai).
   */
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch('admin/chat/conversations/:id/close')
  async close(
    @Param('id') id: string,
    @Body() dto: CloseConversationDto,
  ) {
    const conv = await this.chatService.closeConversation(id, dto);
    return successResponse(conv, 'Conversation closed');
  }

  /**
   * Admin mark conversation da doc — reset unreadByAgent.
   */
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch('admin/chat/conversations/:id/read')
  async markRead(@Param('id') id: string) {
    await this.chatService.markAsRead(id, 'agent');
    return successResponse(null, 'Marked as read');
  }
}
