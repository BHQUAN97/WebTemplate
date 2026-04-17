import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { ChatScenario } from './entities/chat-scenario.entity.js';
import { CreateScenarioDto } from './dto/create-scenario.dto.js';
import { UpdateScenarioDto } from './dto/update-scenario.dto.js';
import { Conversation } from './entities/conversation.entity.js';
import { ChatMessage } from './entities/chat-message.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { ScenarioTrigger } from './chat.constants.js';

/**
 * Context de match scenario.
 */
export interface ScenarioMatchContext {
  message?: string;
  intent?: string;
  event?: string;
  conversationId?: string;
  customerId?: string;
  isFirstMessage?: boolean;
  hasCartItems?: boolean;
  [key: string]: any;
}

/**
 * ChatScenariosService — CRUD + stub matching.
 * `findMatching()` la STUB; wave-2 AI agent se implement logic keyword/intent/event match.
 */
@Injectable()
export class ChatScenariosService extends BaseService<ChatScenario> {
  protected readonly logger2 = new Logger(ChatScenariosService.name);
  protected searchableFields = ['name', 'triggerValue'];

  constructor(
    @InjectRepository(ChatScenario)
    private readonly scenariosRepo: Repository<ChatScenario>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {
    super(scenariosRepo, 'ChatScenario');
  }

  /**
   * Tao scenario moi.
   */
  async createScenario(dto: CreateScenarioDto): Promise<ChatScenario> {
    return this.create(dto as any);
  }

  /**
   * Update scenario.
   */
  async updateScenario(
    id: string,
    dto: UpdateScenarioDto,
  ): Promise<ChatScenario> {
    return this.update(id, dto as any);
  }

  /**
   * Tim scenario khop voi context.
   *
   * Flow:
   *  1. Lay tat ca active scenarios sap xep theo priority DESC
   *  2. Voi moi scenario, check trigger match theo triggerType:
   *     - KEYWORD: message contains triggerValue (case-insensitive, `|` cho OR)
   *     - EVENT: context.event === triggerValue
   *     - INTENT: context.intent === triggerValue
   *     - SCHEDULED: skip (cron xu ly rieng)
   *  3. Check conditions JSON (isFirstMessage, hasCartItems, minDaysSinceLastOrder, customerAuthenticated)
   *  4. Return scenario dau tien match, tang matchCount atomically
   */
  async findMatching(
    context: ScenarioMatchContext,
  ): Promise<ChatScenario | null> {
    const scenarios = await this.scenariosRepo.find({
      where: { isActive: true, deleted_at: IsNull() },
      order: { priority: 'DESC' },
    });

    for (const scenario of scenarios) {
      // Kiem tra trigger truoc
      if (!this.matchTrigger(scenario, context)) continue;

      // Kiem tra conditions (neu co)
      const conditionsOk = await this.matchConditions(scenario, context);
      if (!conditionsOk) continue;

      // Match! Tang matchCount atomically roi return
      await this.scenariosRepo
        .createQueryBuilder()
        .update(ChatScenario)
        .set({ matchCount: () => 'matchCount + 1' })
        .where('id = :id', { id: scenario.id })
        .execute();

      this.logger2.debug(
        `findMatching matched scenario=${scenario.id} name=${scenario.name}`,
      );
      return scenario;
    }

    return null;
  }

  /**
   * Check trigger cua scenario voi context.
   */
  private matchTrigger(
    scenario: ChatScenario,
    context: ScenarioMatchContext,
  ): boolean {
    const triggerValue = scenario.triggerValue ?? '';
    switch (scenario.triggerType) {
      case ScenarioTrigger.KEYWORD: {
        if (!context.message) return false;
        // Normalize bo dau tieng Viet ca 2 phia → user go "xin chao" van khop "chào"
        const message = this.normalizeText(context.message);
        // `|` cho OR logic — vd "hello|hi|chao"
        const keywords = triggerValue
          .split('|')
          .map((k) => this.normalizeText(k))
          .filter(Boolean);
        if (keywords.length === 0) return false;
        // Dung word-boundary regex de tranh false-positive substring.
        // Vi du: keyword "hong" (tu "hỏng") KHONG duoc match "khong" (tu "không").
        // Neu keyword chua nhieu tu (co space) → dung \b hai dau van OK vi space cung la boundary.
        return keywords.some((kw) => {
          const pattern = new RegExp(
            `\\b${this.escapeRegExp(kw)}\\b`,
            'i',
          );
          return pattern.test(message);
        });
      }
      case ScenarioTrigger.EVENT:
        return !!context.event && context.event === triggerValue;
      case ScenarioTrigger.INTENT:
        // Intent classifier chua co — skip unless context.intent present
        return !!context.intent && context.intent === triggerValue;
      case ScenarioTrigger.SCHEDULED:
        // Cron tick xu ly rieng trong ChatSchedulerService
        return false;
      default:
        return false;
    }
  }

  /**
   * Check conditions JSON cua scenario — query DB neu can.
   */
  private async matchConditions(
    scenario: ChatScenario,
    context: ScenarioMatchContext,
  ): Promise<boolean> {
    const conditions = scenario.conditions;
    if (!conditions || Object.keys(conditions).length === 0) return true;

    // Load conversation de check nhieu dieu kien
    let conversation: Conversation | null = null;
    if (context.conversationId) {
      conversation = await this.conversationRepo.findOne({
        where: { id: context.conversationId, deleted_at: IsNull() },
      });
    }

    // isFirstMessage — dem messages cua conversation === 1 (chi co mess khach vua gui)
    if (conditions.isFirstMessage !== undefined && context.conversationId) {
      const count = await this.messageRepo.count({
        where: { conversationId: context.conversationId },
      });
      const isFirst = count <= 1;
      if (conditions.isFirstMessage !== isFirst) return false;
    }

    // hasCartItems — conversation.metadata.cartId ton tai
    if (conditions.hasCartItems !== undefined) {
      const hasCart = !!conversation?.metadata?.cartId;
      if (conditions.hasCartItems !== hasCart) return false;
    }

    // minDaysSinceLastOrder — query orders cua customer, neu order gan nhat < N ngay thi fail
    if (
      typeof conditions.minDaysSinceLastOrder === 'number' &&
      (context.customerId || conversation?.customerId)
    ) {
      const customerId = context.customerId ?? conversation?.customerId;
      if (!customerId) return false;
      const lastOrder = await this.orderRepo.findOne({
        where: { user_id: customerId, deleted_at: IsNull() },
        order: { created_at: 'DESC' },
      });
      if (!lastOrder) {
        // Khong co order nao — coi nhu du dieu kien (infinite days)
      } else {
        const days =
          (Date.now() - new Date(lastOrder.created_at).getTime()) /
          (1000 * 60 * 60 * 24);
        if (days < conditions.minDaysSinceLastOrder) return false;
      }
    }

    // customerAuthenticated — conversation.customerId != null
    if (conditions.customerAuthenticated !== undefined) {
      const isAuth = !!(conversation?.customerId ?? context.customerId);
      if (conditions.customerAuthenticated !== isAuth) return false;
    }

    return true;
  }

  /**
   * Interpolate template voi context — replace `{{key}}` va `{{a.b.c}}` (dot notation).
   * Neu key khong co value → thay bang empty string (an toan hon giu nguyen placeholder).
   */
  interpolate(template: string, context: Record<string, any>): string {
    if (!template) return '';
    return template.replace(
      /\{\{\s*([\w.]+)\s*\}\}/g,
      (_match, path: string) => {
        const value = this.resolvePath(context, path);
        return value == null ? '' : String(value);
      },
    );
  }

  /**
   * Helper: resolve dot-notation path tu object — vd "customer.name".
   */
  private resolvePath(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => {
      if (acc == null) return undefined;
      return acc[key];
    }, obj);
  }

  /**
   * Escape cac ky tu dac biet cua regex trong keyword de tranh ReDoS / sai match.
   * Dung khi build `new RegExp(\\b{kw}\\b)` cho KEYWORD trigger.
   */
  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Normalize text cho keyword matching:
   *  - lowercase
   *  - bo dau tieng Viet (NFD + strip combining marks)
   *  - thay 'd'/'D' cho đ/Đ
   *  - trim whitespace
   *
   * Giup user go "xin chao" (khong dau) match voi trigger "chào" (co dau)
   * va nguoc lai.
   */
  private normalizeText(str: string): string {
    return (str ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .trim();
  }
}
