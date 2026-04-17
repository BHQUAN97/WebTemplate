import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities/conversation.entity.js';
import { ChatMessage } from '../entities/chat-message.entity.js';
import { MessageRole } from '../chat.constants.js';
import { ChatScenariosService } from '../chat-scenarios.service.js';
import { ChatToolsService } from './tools/chat-tools.service.js';
import {
  chatToolDefinitions,
  executeFunctionCall,
} from './tools/tool-definitions.js';
import { ChatActorType, ChatToolContext } from './tools/tool-context.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { MockProvider } from './providers/mock.provider.js';
import {
  IAiProvider,
  ProviderMessage,
} from './providers/provider.types.js';
import {
  DEFAULT_SYSTEM_PROMPT,
  buildSystemPrompt,
} from './prompts/system-prompt.js';

/**
 * Context truyen vao khi chay scenario — dung de interpolate template `{{var}}`.
 */
export interface ScenarioContext {
  customerName?: string;
  customerEmail?: string;
  productName?: string;
  orderCode?: string;
  [key: string]: any;
}

/**
 * Reply sinh ra tu `generateReply` — content + metadata de log vao message.
 */
export interface AiReplyResult {
  content: string;
  metadata: {
    model?: string;
    tokens?: { prompt?: number; completion?: number; total?: number };
    toolCalls?: Array<{ name: string; args: Record<string, any>; result?: any }>;
    scenarioId?: string;
    fallback?: boolean;
    provider?: string;
  };
}

/**
 * AiService — orchestrator cho AI reply pipeline.
 *
 * Pipeline:
 *  1. Load conversation + last 20 messages
 *  2. Fast-path: check scenario match theo keyword priority ≥ 100
 *  3. Build history cho provider
 *  4. Provider.chat(tools) — loop tool calls (max N iterations)
 *  5. Fallback canned message neu fail
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly maxHistory = 20;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    private readonly scenariosService: ChatScenariosService,
    private readonly toolsService: ChatToolsService,
    private readonly geminiProvider: GeminiProvider,
    private readonly mockProvider: MockProvider,
  ) {}

  /**
   * Sinh phan hoi AI cho 1 conversation — core orchestration.
   */
  async generateReply(conversationId: string): Promise<AiReplyResult> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conversation) {
      this.logger.warn(`generateReply: conversation ${conversationId} not found`);
      return this.canned('Không tìm thấy hội thoại.', true);
    }

    // Load 20 messages gan nhat, order ASC de chronological
    const history = await this.messageRepo.find({
      where: { conversationId },
      order: { created_at: 'DESC' },
      take: this.maxHistory,
    });
    history.reverse();

    const lastUserMessage = [...history]
      .reverse()
      .find((m) => m.role === MessageRole.USER);
    const userText = lastUserMessage?.content ?? '';

    // === Fast-path: scenario match ===
    try {
      const scenario = await this.scenariosService.findMatching({
        message: userText,
        customerId: conversation.customerId ?? undefined,
      });
      if (scenario && (scenario.priority ?? 0) >= 100) {
        const interpolated = this.interpolate(scenario.response, {
          customerName: conversation.customerName ?? '',
          customerEmail: conversation.customerEmail ?? '',
        });
        this.logger.debug(
          `generateReply: scenario fast-path id=${scenario.id} priority=${scenario.priority}`,
        );
        return {
          content: interpolated,
          metadata: {
            scenarioId: scenario.id,
            provider: 'scenario',
          },
        };
      }
    } catch (err) {
      this.logger.warn(
        `scenario match failed (non-fatal): ${(err as Error).message}`,
      );
    }

    // === AI pipeline ===
    const providerName = this.config.get<string>('ai.provider') ?? 'gemini';
    const provider = this.pickProvider(providerName);

    const brand =
      this.config.get<string>('ai.brandName') ??
      this.config.get<string>('app.name') ??
      'shop';
    const systemInstruction = buildSystemPrompt(DEFAULT_SYSTEM_PROMPT, brand);

    // Convert DB messages → provider format
    const providerMessages: ProviderMessage[] = history.map((m) => ({
      role: this.mapRole(m.role),
      content: m.content,
    }));

    const maxIterations =
      this.config.get<number>('ai.maxToolIterations') ?? 3;
    const temperature = this.config.get<number>('ai.temperature') ?? 0.7;
    const maxTokens = this.config.get<number>('ai.maxTokens') ?? 1024;

    // Build tool authorization context — GUEST neu chua co customerId.
    // Chu y: ke ca co customerEmail/Phone o conversation, van coi GUEST neu
    // customerId khong set (chua login), de AI khong leak order cua account
    // co cung email ma khach guest vua go vao.
    const ctx: ChatToolContext = {
      conversationId: conversation.id,
      actor: conversation.customerId
        ? ChatActorType.CUSTOMER
        : ChatActorType.GUEST,
      customerId: conversation.customerId ?? undefined,
      customerEmail: conversation.customerEmail ?? undefined,
      customerPhone: conversation.customerPhone ?? undefined,
      sessionId: (conversation.metadata as any)?.customerSessionId,
    };

    const toolCallLog: Array<{
      name: string;
      args: Record<string, any>;
      result?: any;
    }> = [];
    let finalUsage: { input?: number; output?: number; total?: number } | undefined;
    let finalModel: string | undefined;

    try {
      for (let iter = 0; iter < maxIterations; iter++) {
        const result = await provider.chat({
          messages: providerMessages,
          systemInstruction,
          tools: chatToolDefinitions,
          temperature,
          maxTokens,
        });

        finalUsage = result.usage;
        finalModel = result.model;

        // Neu AI request tool call → execute va feed lai
        if (result.toolCalls && result.toolCalls.length > 0) {
          // Protocol Gemini yeu cau:
          //  1. Push model turn chua functionCall(s) vao history
          //  2. Push function turn chua functionResponse(s) theo sau
          //  3. Re-call model → AI nhin thay ca 2 va sinh response tiep theo
          // Neu bo qua step 1, Gemini khong hieu functionResponse khop voi call nao
          // → model hallucination hoac error "function response without matching call".
          providerMessages.push({
            role: 'model',
            content: result.text ?? '',
            functionCalls: result.toolCalls.map((c) => ({
              name: c.name,
              args: c.args,
            })),
            // Gemini 2.5+: preserve thoughtSignature de iteration tiep theo
            // khong bi 400 "Function call is missing a thought_signature".
            thoughtSignature: result.thoughtSignature,
          });

          for (const call of result.toolCalls) {
            // Forward ctx → tools enforce permission/audit/rate-limit.
            // Tool da wrap error trong { error } neu denied/rate_limited/input
            // → loop khong crash, AI nhan function response va tu xu ly.
            const toolResult = await executeFunctionCall(
              call.name,
              call.args,
              this.toolsService,
              ctx,
            );
            toolCallLog.push({
              name: call.name,
              args: call.args,
              result: toolResult,
            });

            // Push tool result vao provider messages
            providerMessages.push({
              role: 'function',
              content: '',
              functionResponse: {
                name: call.name,
                response: toolResult as any,
              },
            });
          }
          // Continue loop — provider goi lai voi tool results
          continue;
        }

        // Co text → return
        if (result.text && result.text.trim()) {
          return {
            content: result.text.trim(),
            metadata: {
              model: finalModel,
              tokens: finalUsage
                ? {
                    prompt: finalUsage.input,
                    completion: finalUsage.output,
                    total: finalUsage.total,
                  }
                : undefined,
              toolCalls: toolCallLog.length ? toolCallLog : undefined,
              provider: provider.name,
            },
          };
        }

        // Khong text cung khong tool call → break
        break;
      }

      // Het iterations ma khong co text → fallback
      this.logger.warn(
        `generateReply: exhausted ${maxIterations} iterations without final text`,
      );
      return this.canned(
        'Shop chưa có thông tin về điều này, bạn vui lòng liên hệ hotline để được hỗ trợ nhé.',
        true,
        provider.name,
      );
    } catch (err) {
      this.logger.error(
        `generateReply failed (${provider.name}): ${(err as Error).message}`,
      );
      // Fallback final — canned message (policy: huong hotline / nhan vien)
      return this.canned(
        'Shop xin lỗi bạn, hệ thống đang bận. Shop sẽ chuyển thông tin cho nhân viên hỗ trợ, bạn vui lòng chờ 5-10 phút hoặc liên hệ hotline nhé.',
        true,
        provider.name,
      );
    }
  }

  /**
   * Chay scenario template + context — interpolate `{{var}}` placeholders.
   * Tra ve response da resolve, hoac empty string neu scenario khong ton tai.
   */
  async runScenario(
    scenarioId: string,
    context: ScenarioContext,
  ): Promise<string> {
    try {
      const scenario = await this.scenariosService.findById(scenarioId);
      if (!scenario) return '';
      return this.interpolate(scenario.response, context);
    } catch (err) {
      this.logger.warn(
        `runScenario ${scenarioId} failed: ${(err as Error).message}`,
      );
      return '';
    }
  }

  /**
   * Pick provider theo config. Fallback mock neu provider chinh khong available.
   */
  private pickProvider(name: string): IAiProvider {
    if (name === 'mock') return this.mockProvider;
    if (name === 'gemini') {
      if (this.geminiProvider.isAvailable()) return this.geminiProvider;
      this.logger.warn(
        'Gemini not available (no API key) — falling back to mock provider',
      );
      return this.mockProvider;
    }
    // groq/ollama chua implement — fallback mock
    this.logger.warn(
      `Provider "${name}" not implemented yet — using mock provider`,
    );
    return this.mockProvider;
  }

  /**
   * Map MessageRole (DB enum) → ProviderRole (Gemini format).
   */
  private mapRole(role: MessageRole): ProviderMessage['role'] {
    switch (role) {
      case MessageRole.AI:
      case MessageRole.AGENT:
        return 'model';
      case MessageRole.SYSTEM:
        return 'system';
      case MessageRole.USER:
      default:
        return 'user';
    }
  }

  /**
   * Helper: thay the `{{key}}` trong template voi context values.
   */
  protected interpolate(template: string, context: ScenarioContext): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
      const value = context[key];
      return value == null ? '' : String(value);
    });
  }

  /**
   * Canned reply khi fallback — set metadata.fallback=true.
   */
  private canned(
    text: string,
    fallback = true,
    provider = 'fallback',
  ): AiReplyResult {
    return {
      content: text,
      metadata: { fallback, provider },
    };
  }
}
