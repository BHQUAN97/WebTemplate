import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  IsNull,
  LessThan,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { CronExpressionParser } from 'cron-parser';
import {
  ConversationStatus,
  MessageRole,
  MessageType,
  ScenarioTrigger,
  ScheduleMode,
} from '../chat.constants.js';
import { Conversation } from '../entities/conversation.entity.js';
import { ChatScenario } from '../entities/chat-scenario.entity.js';
import { ChatService } from '../chat.service.js';
import { ChatScenariosService } from '../chat-scenarios.service.js';

/**
 * ChatSchedulerService — gom 4 cron jobs:
 *  1. processScheduledScenarios (moi phut) — fire scenarios co triggerType=SCHEDULED
 *  2. abandonedCartReminder (30p) — nhac khach co cartId
 *  3. followUpAfterClose (1h) — xin rating sau khi close > 24h
 *  4. autoAssignWaitingConversations (5p) — gan agent cho queue WAITING_AGENT
 */
@Injectable()
export class ChatSchedulerService {
  private readonly logger = new Logger(ChatSchedulerService.name);

  /**
   * Set ghi lai scenarioId da fire trong phut hien tai — tranh double-fire
   * khi cron tick nhanh (moi phut chi nen fire 1 lan). Clear vao lan tick sau.
   */
  private firedScenariosThisMinute = new Map<string, number>();

  constructor(
    @InjectRepository(ChatScenario)
    private readonly scenarioRepo: Repository<ChatScenario>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    private readonly chatService: ChatService,
    private readonly scenariosService: ChatScenariosService,
  ) {}

  /**
   * Minute-tick — scan scheduled scenarios va fire neu cron expression match phut hien tai.
   */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'chat-scheduler-scenarios' })
  async processScheduledScenarios(): Promise<void> {
    try {
      const scenarios = await this.scenarioRepo.find({
        where: {
          triggerType: ScenarioTrigger.SCHEDULED,
          isActive: true,
          deleted_at: IsNull(),
        },
      });
      if (scenarios.length === 0) return;

      const now = new Date();
      // Cleanup fired set — xoa entries qua 90s de tranh memory leak
      for (const [key, ts] of this.firedScenariosThisMinute) {
        if (now.getTime() - ts > 90 * 1000) {
          this.firedScenariosThisMinute.delete(key);
        }
      }

      for (const scenario of scenarios) {
        if (this.firedScenariosThisMinute.has(scenario.id)) continue;
        if (!this.cronMatchesNow(scenario.triggerValue, now)) continue;

        this.firedScenariosThisMinute.set(scenario.id, now.getTime());
        await this.fireScheduledScenario(scenario);
      }
    } catch (err) {
      this.logger.error(
        `processScheduledScenarios error: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  /**
   * Cron 30p — tim conversation co cartId va lastMessageAt > 1h, chua remind.
   * Gui message nhac khach + mark metadata.abandonedReminded=true. Cap 50/run.
   */
  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'chat-abandoned-cart' })
  async abandonedCartReminder(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      // Filter o JS layer — mot so MySQL khong ho tro JSON path where chuan
      const candidates = await this.convRepo
        .createQueryBuilder('c')
        .where('c.deleted_at IS NULL')
        .andWhere('c.status != :closed', { closed: ConversationStatus.CLOSED })
        .andWhere('c.lastMessageAt < :t', { t: oneHourAgo })
        .andWhere('c.metadata IS NOT NULL')
        .orderBy('c.lastMessageAt', 'DESC')
        .take(200)
        .getMany();

      const targets = candidates
        .filter(
          (c) =>
            !!c.metadata?.cartId && !c.metadata?.abandonedReminded,
        )
        .slice(0, 50);

      for (const conv of targets) {
        try {
          await this.chatService.sendMessage(
            conv.id,
            {
              content:
                'Ban van con san pham trong gio hang. Can em ho tro de hoan tat don khong a?',
              type: MessageType.TEXT,
            },
            { role: MessageRole.AI, name: 'AI Assistant' },
          );
          await this.convRepo.update(
            { id: conv.id },
            {
              metadata: {
                ...(conv.metadata ?? {}),
                abandonedReminded: true,
                abandonedRemindedAt: new Date().toISOString(),
              } as any,
            },
          );
        } catch (innerErr) {
          this.logger.warn(
            `abandonedCartReminder failed conv=${conv.id}: ${(innerErr as Error).message}`,
          );
        }
      }

      if (targets.length > 0) {
        this.logger.log(`abandonedCartReminder sent ${targets.length} reminders`);
      }
    } catch (err) {
      this.logger.error(
        `abandonedCartReminder error: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Cron 1h — conversation da CLOSED > 24h, chua co rating, chua follow-up.
   * Gui message xin rating. Mark metadata.followUpSent=true.
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'chat-follow-up' })
  async followUpAfterClose(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const candidates = await this.convRepo
        .createQueryBuilder('c')
        .where('c.deleted_at IS NULL')
        .andWhere('c.status = :closed', { closed: ConversationStatus.CLOSED })
        .andWhere('c.rating IS NULL')
        .andWhere('c.updated_at < :t', { t: cutoff })
        .take(100)
        .getMany();

      const targets = candidates
        .filter((c) => !c.metadata?.followUpSent)
        .slice(0, 50);

      for (const conv of targets) {
        try {
          await this.chatService.sendMessage(
            conv.id,
            {
              content:
                'Ban co hai long voi ho tro cua shop khong a? Vui long danh gia giup shop nhe.',
              type: MessageType.TEXT,
            },
            { role: MessageRole.SYSTEM, name: 'He thong' },
          );
          await this.convRepo.update(
            { id: conv.id },
            {
              metadata: {
                ...(conv.metadata ?? {}),
                followUpSent: true,
                followUpSentAt: new Date().toISOString(),
              } as any,
            },
          );
        } catch (innerErr) {
          this.logger.warn(
            `followUpAfterClose failed conv=${conv.id}: ${(innerErr as Error).message}`,
          );
        }
      }

      if (targets.length > 0) {
        this.logger.log(`followUpAfterClose sent ${targets.length} follow-ups`);
      }
    } catch (err) {
      this.logger.error(
        `followUpAfterClose error: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Cron 5p — conversation WAITING_AGENT > 10p chua co agent.
   * Hien tai khong co presence tracking => skip auto-assign agent thuc te,
   * chi fire AI fallback de khong bo roi khach.
   */
  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'chat-auto-assign-waiting',
  })
  async autoAssignWaitingConversations(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 10 * 60 * 1000);
      const waiting = await this.convRepo.find({
        where: {
          status: ConversationStatus.WAITING_AGENT,
          agentId: IsNull(),
          lastMessageAt: LessThan(cutoff),
          deleted_at: IsNull(),
        },
        order: { lastMessageAt: 'ASC' },
        take: 20,
      });
      if (waiting.length === 0) return;

      // Khong co presence service — fallback: AI tra loi tiep tuc giu khach
      for (const conv of waiting) {
        try {
          if (conv.mode === ScheduleMode.HUMAN) {
            // Khong AI trong HUMAN mode — chi log
            this.logger.debug(
              `waiting conv=${conv.id} HUMAN mode, no agent online — skip AI fallback`,
            );
            continue;
          }
          await this.chatService.triggerAiReply(conv.id);
        } catch (innerErr) {
          this.logger.warn(
            `autoAssignWaiting fallback AI failed conv=${conv.id}: ${(innerErr as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `autoAssignWaitingConversations error: ${(err as Error).message}`,
      );
    }
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Kiem tra cron expression co match phut hien tai khong.
   * Lay next-fire truoc (now + 1s) va so sanh yyyy-MM-ddTHH:mm voi now.
   */
  private cronMatchesNow(expression: string, now: Date): boolean {
    try {
      // Parse cron — tim fire time trong khoang +/- 1 phut
      const interval = CronExpressionParser.parse(expression, {
        currentDate: new Date(now.getTime() - 1000),
      });
      const next = interval.next().toDate();
      // Match neu next nam trong cung phut voi now (sai lech < 60s)
      const diff = Math.abs(next.getTime() - now.getTime());
      return diff < 60 * 1000;
    } catch (err) {
      this.logger.warn(
        `Invalid cron expression "${expression}": ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Fire 1 scheduled scenario — bay gio se gui response cho TAT CA active
   * conversations khong CLOSED va mode != HUMAN (audience filter wave-3 se lam).
   * Cap 100 conversations/scenario de tranh burst.
   */
  private async fireScheduledScenario(scenario: ChatScenario): Promise<void> {
    try {
      // Audience — wave-3 co the customize theo scenario.conditions
      const conversations = await this.convRepo.find({
        where: {
          status: Not(ConversationStatus.CLOSED) as any,
          mode: Not(ScheduleMode.HUMAN) as any,
          deleted_at: IsNull(),
        },
        order: { lastMessageAt: 'DESC' },
        take: 100,
      });

      this.logger.log(
        `Firing scheduled scenario=${scenario.id} name=${scenario.name} to ${conversations.length} conv(s)`,
      );

      for (const conv of conversations) {
        try {
          // Interpolate template voi conversation context
          const content = this.scenariosService.interpolate(
            scenario.response,
            {
              customer: {
                name: conv.customerName,
                email: conv.customerEmail,
                phone: conv.customerPhone,
              },
              conversationId: conv.id,
            },
          );
          if (!content) continue;

          await this.chatService.sendMessage(
            conv.id,
            { content, type: scenario.responseType ?? MessageType.TEXT },
            { role: MessageRole.AI, name: 'AI Assistant' },
          );
        } catch (innerErr) {
          this.logger.warn(
            `fireScheduledScenario failed conv=${conv.id}: ${(innerErr as Error).message}`,
          );
        }
      }

      // Tang matchCount cho scenario
      await this.scenarioRepo
        .createQueryBuilder()
        .update(ChatScenario)
        .set({ matchCount: () => 'matchCount + 1' })
        .where('id = :id', { id: scenario.id })
        .execute();
    } catch (err) {
      this.logger.error(
        `fireScheduledScenario error scenario=${scenario.id}: ${(err as Error).message}`,
      );
    }
  }
}
