import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Part,
  ChatSession,
} from '@google/generative-ai';
import {
  IAiProvider,
  ProviderChatInput,
  ProviderChatResult,
  ProviderMessage,
} from './provider.types.js';

/**
 * Gemini provider — Google Generative AI SDK wrapper.
 *
 * Free tier limits (gemini-1.5-flash):
 *  - 15 requests/minute
 *  - 1500 requests/day
 *  - 1M tokens/day
 *
 * Features supported:
 *  - Function calling (tools) — dung ChatSession de preserve functionCall/functionResponse
 *  - System instruction
 *  - Multi-turn history
 *  - Exponential backoff on 429 rate limit
 *
 * Implementation notes:
 *  Gemini protocol doi hoi history chua CA `{ role: 'model', parts: [functionCall] }`
 *  VA `{ role: 'function', parts: [functionResponse] }` de context duoc hieu dung.
 *  `ChatSession` (tu `model.startChat`) tu quan ly history dung chuan — moi
 *  `sendMessage` call tu dong append user turn + model turn (bao gom functionCall) vao
 *  noi bo. Gui functionResponse lai bang `sendMessage([functionResponsePart])` giu
 *  duoc model turn truoc do → avoid confusion.
 */
@Injectable()
export class GeminiProvider implements IAiProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private client: GoogleGenerativeAI | null = null;
  private readonly modelName: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('ai.geminiApiKey') ?? '';
    this.modelName =
      this.config.get<string>('ai.geminiModel') ?? 'gemini-1.5-flash';
    this.timeoutMs = this.config.get<number>('ai.requestTimeoutMs') ?? 10000;

    if (this.apiKey) {
      this.client = new GoogleGenerativeAI(this.apiKey);
    } else {
      this.logger.warn(
        'GEMINI_API_KEY empty — GeminiProvider will throw if called. Use AI_PROVIDER=mock for dev.',
      );
    }
  }

  /**
   * Provider co kha dung khong — api key co va client init OK.
   */
  isAvailable(): boolean {
    return !!this.client;
  }

  /**
   * Chat — convert messages sang Gemini Content[], goi generateContent,
   * retry voi exponential backoff khi gap 429.
   *
   * Logic:
   *  - Split messages thanh: history (truoc khi goi) + functionResponseParts (cuoi) + lastUserText (cuoi cung)
   *  - Tao ChatSession voi history → SDK tu append model turn (bao gom functionCall) vao internal state
   *  - Send functionResponse hoac user text → nhan response
   *  - Return text hoac tool calls moi de AiService loop tiep
   */
  async chat(input: ProviderChatInput): Promise<ProviderChatResult> {
    if (!this.client) {
      throw new Error(
        'GeminiProvider: GEMINI_API_KEY not configured. Set AI_PROVIDER=mock for dev.',
      );
    }

    const model: GenerativeModel = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: input.systemInstruction,
      tools: input.tools?.length
        ? [{ functionDeclarations: input.tools }]
        : undefined,
      generationConfig: {
        temperature: input.temperature ?? 0.7,
        maxOutputTokens: input.maxTokens ?? 1024,
      },
    });

    const { historyContents, sendParts } = this.splitForChatSession(
      input.messages,
    );

    // Retry 3 lan cho 429 rate limit — exponential backoff 1s/2s/4s
    const maxRetries = 3;
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const chat: ChatSession = model.startChat({
          history: historyContents,
        });

        const result = await this.withTimeout(
          chat.sendMessage(sendParts),
          this.timeoutMs,
        );

        const response = result.response;
        const candidate = response.candidates?.[0];
        const parts: Part[] = candidate?.content?.parts ?? [];

        const toolCalls: Array<{ name: string; args: Record<string, any> }> =
          [];
        let text = '';
        // Gemini 2.5+ tra `thoughtSignature` kem functionCall part. SDK 0.24.1
        // chua co type nhung field ton tai o runtime — capture qua any cast.
        let thoughtSignature: string | undefined;

        for (const part of parts) {
          if (part.functionCall) {
            toolCalls.push({
              name: part.functionCall.name,
              args: (part.functionCall.args as Record<string, any>) ?? {},
            });
            const sig = (part as any).thoughtSignature;
            if (typeof sig === 'string' && sig.length > 0) {
              thoughtSignature = sig;
            }
          } else if (typeof part.text === 'string') {
            text += part.text;
          }
        }

        const usage = response.usageMetadata
          ? {
              input: response.usageMetadata.promptTokenCount,
              output: response.usageMetadata.candidatesTokenCount,
              total: response.usageMetadata.totalTokenCount,
            }
          : undefined;

        return {
          text,
          toolCalls: toolCalls.length ? toolCalls : undefined,
          thoughtSignature,
          usage,
          model: this.modelName,
          finishReason: candidate?.finishReason,
        };
      } catch (err) {
        lastError = err;
        const msg = (err as Error).message ?? '';
        const is429 =
          msg.includes('429') ||
          msg.toLowerCase().includes('rate') ||
          msg.toLowerCase().includes('quota');

        if (!is429 || attempt === maxRetries) {
          this.logger.error(
            `Gemini chat failed (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}`,
          );
          throw err;
        }

        const backoffMs = 1000 * Math.pow(2, attempt);
        this.logger.warn(
          `Gemini rate-limited, retry in ${backoffMs}ms (attempt ${attempt + 1})`,
        );
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }

    throw lastError ?? new Error('Gemini chat failed after retries');
  }

  /**
   * Chia messages thanh history (cho startChat) + sendParts (cho sendMessage).
   *
   * Rules:
   *  - `system` → skip (dung systemInstruction)
   *  - Lay tat ca messages TRU turn cuoi cung lam history
   *  - Turn cuoi cung (user hoac function) → `sendParts` de goi sendMessage
   *  - Neu turn cuoi la user text → send `[{ text }]`
   *  - Neu turn cuoi la 1 hoac nhieu function responses (sau tool call) → gom thanh 1 send
   *    voi array cac functionResponse parts (SDK ho tro)
   *
   * Tinh huong thuc te:
   *  - Iteration 1: messages ket thuc bang role='user' (cau hoi moi nhat)
   *    → history = moi thu truoc, sendParts = [{ text: user_message }]
   *  - Iteration 2+: messages ket thuc bang role='function' (tool result vua push)
   *    → history = moi thu truoc, sendParts = [{ functionResponse: {...} }, ...]
   *    (ChatSession da giu functionCall model turn trong memory tu iteration truoc,
   *    nhung vi chung ta tao ChatSession moi moi call, cac turn model co functionCall
   *    phai nam trong history — toGeminiContents handle role='model' voi functionCall
   *    qua text conversion; nhung vi messages ta build chi chua text cho model, nen
   *    protocol that su hoat dong qua functionResponse → model hieu tu context).
   */
  private splitForChatSession(messages: ProviderMessage[]): {
    historyContents: Content[];
    sendParts: string | Part[];
  } {
    // Loai system — Gemini dung systemInstruction rieng
    const filtered = messages.filter((m) => m.role !== 'system');
    if (filtered.length === 0) {
      return { historyContents: [], sendParts: '' };
    }

    // Gom trailing function responses thanh 1 send (SDK cho phep send nhieu parts)
    const trailingFnResponses: Part[] = [];
    let endIdx = filtered.length;
    for (let i = filtered.length - 1; i >= 0; i--) {
      const m = filtered[i];
      if (m.role === 'function' && m.functionResponse) {
        trailingFnResponses.unshift({
          functionResponse: {
            name: m.functionResponse.name,
            response: this.safeJson(m.functionResponse.response),
          },
        } as Part);
        endIdx = i;
      } else {
        break;
      }
    }

    if (trailingFnResponses.length > 0) {
      const historyContents = this.toGeminiContents(filtered.slice(0, endIdx));
      return { historyContents, sendParts: trailingFnResponses };
    }

    // Khong co function response trailing → lay user turn cuoi lam sendMessage
    const last = filtered[filtered.length - 1];
    if (last.role === 'user') {
      const historyContents = this.toGeminiContents(
        filtered.slice(0, filtered.length - 1),
      );
      return { historyContents, sendParts: last.content ?? '' };
    }

    // Edge case: turn cuoi la model (vd khi retry sau assistant gop turn)
    // → fallback: gui empty text de trigger response
    return {
      historyContents: this.toGeminiContents(filtered),
      sendParts: '',
    };
  }

  /**
   * Convert internal ProviderMessage[] → Gemini Content[] (cho history).
   *
   * Quy tac:
   *  - role='user' → Gemini role 'user'
   *  - role='model' → Gemini role 'model' (AI reply history)
   *  - role='system' → skip (caller nen filter truoc)
   *  - role='function' → role 'function' voi functionResponse part
   */
  private toGeminiContents(messages: ProviderMessage[]): Content[] {
    const contents: Content[] = [];
    for (const m of messages) {
      if (m.role === 'system') continue;

      if (m.role === 'function' && m.functionResponse) {
        contents.push({
          role: 'function',
          parts: [
            {
              functionResponse: {
                name: m.functionResponse.name,
                response: this.safeJson(m.functionResponse.response),
              },
            } as Part,
          ],
        });
        continue;
      }

      // Model turn co functionCall(s) — PHAI preserve trong history de Gemini
      // hieu functionResponse o turn sau tuong ung voi call nao. Neu bo qua,
      // Gemini se confused: "function response khong khop voi call truoc do".
      //
      // Gemini 2.5+: CON phai preserve `thoughtSignature` tren functionCall
      // part dau tien, neu khong se 400 "Function call is missing a
      // thought_signature in functionCall parts".
      if (m.role === 'model' && m.functionCalls && m.functionCalls.length) {
        const parts: Part[] = m.functionCalls.map((fc, idx) => {
          const part: any = { functionCall: { name: fc.name, args: fc.args } };
          // Gan thoughtSignature vao part dau tien (Gemini yeu cau vay)
          if (idx === 0 && m.thoughtSignature) {
            part.thoughtSignature = m.thoughtSignature;
          }
          return part as Part;
        });
        // Neu co text kem theo → them text part
        if (m.content) parts.unshift({ text: m.content } as Part);
        contents.push({ role: 'model', parts });
        continue;
      }

      contents.push({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content || '' }],
      });
    }
    return contents;
  }

  /**
   * Dam bao response la JSON object (Gemini yeu cau response field la object).
   */
  private safeJson(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return { result: value };
  }

  /**
   * Wrap promise voi timeout — reject neu qua han.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Gemini request timeout after ${ms}ms`)),
        ms,
      );
      promise
        .then((v) => {
          clearTimeout(timer);
          resolve(v);
        })
        .catch((e) => {
          clearTimeout(timer);
          reject(e);
        });
    });
  }
}
