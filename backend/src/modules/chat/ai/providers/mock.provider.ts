import { Injectable, Logger } from '@nestjs/common';
import {
  IAiProvider,
  ProviderChatInput,
  ProviderChatResult,
} from './provider.types.js';

/**
 * Mock provider — canned responses theo keyword match.
 * Dung khi:
 *  - AI_PROVIDER=mock (dev mode, khong co API key)
 *  - Gemini API fail va can fallback graceful
 *
 * Khong goi network, khong ton chi phi.
 */
@Injectable()
export class MockProvider implements IAiProvider {
  readonly name = 'mock';
  private readonly logger = new Logger(MockProvider.name);

  /**
   * Simple keyword → response mapping. Uu tien match theo thu tu dang nhap.
   */
  private readonly rules: Array<{ keywords: string[]; response: string }> = [
    {
      keywords: ['chao', 'xin chao', 'hello', 'hi', 'alo'],
      response:
        'Em chao a/c! Em la tro ly AI cua shop. A/c can em ho tro gi hom nay a?',
    },
    {
      keywords: ['gia', 'bao nhieu', 'cost', 'price'],
      response:
        'Da, a/c vui long cho em biet ten san pham cu the de em bao gia chinh xac nha.',
    },
    {
      keywords: ['ship', 'giao hang', 'van chuyen', 'shipping'],
      response:
        'Shop giao hang toan quoc a. Noi thanh 1-2 ngay, tinh thanh 3-5 ngay. Phi ship tu 20k-50k, don tu 500k duoc mien phi ship.',
    },
    {
      keywords: ['don hang', 'order', 'kiem tra don'],
      response:
        'Da, a/c vui long cho em ma don hang hoac so dien thoai da dat de em kiem tra nhe.',
    },
    {
      keywords: ['khuyen mai', 'sale', 'giam gia', 'ma giam'],
      response:
        'Hien shop co 1 so uu dai dang chay a. A/c muon em gui ma giam gia cho san pham nao a?',
    },
    {
      keywords: ['help', 'giup', 'ho tro'],
      response:
        'Da, em san sang ho tro a/c. A/c co the hoi ve san pham, don hang, khuyen mai hoac chinh sach van chuyen nhe.',
    },
  ];

  async chat(input: ProviderChatInput): Promise<ProviderChatResult> {
    const lastUserMessage =
      [...input.messages].reverse().find((m) => m.role === 'user')?.content ??
      '';
    const lower = lastUserMessage.toLowerCase();

    this.logger.debug(`mock.chat last="${lastUserMessage.slice(0, 80)}"`);

    for (const rule of this.rules) {
      if (rule.keywords.some((k) => lower.includes(k))) {
        return {
          text: rule.response,
          model: 'mock',
          usage: { input: 0, output: 0, total: 0 },
        };
      }
    }

    return {
      text: 'Da, em da nhan duoc tin nhan cua a/c. Em se chuyen cho nhan vien ho tro som nhat nhe.',
      model: 'mock',
      usage: { input: 0, output: 0, total: 0 },
    };
  }
}
