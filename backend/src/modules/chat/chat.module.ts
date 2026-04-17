import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { Faq } from '../faq/entities/faq.entity.js';
import { Promotion } from '../promotions/entities/promotion.entity.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { Conversation } from './entities/conversation.entity.js';
import { ChatMessage } from './entities/chat-message.entity.js';
import { ChatSchedule } from './entities/chat-schedule.entity.js';
import { ChatScenario } from './entities/chat-scenario.entity.js';
import { ChatToolCall } from './entities/chat-tool-call.entity.js';
import { ChatService } from './chat.service.js';
import { ChatSchedulesService } from './chat-schedules.service.js';
import { ChatScenariosService } from './chat-scenarios.service.js';
import { ChatController } from './chat.controller.js';
import { ChatSchedulesController } from './chat-schedules.controller.js';
import { ChatScenariosController } from './chat-scenarios.controller.js';
import { ChatGateway } from './chat.gateway.js';
import { AiService } from './ai/ai.service.js';
import { ChatToolsService } from './ai/tools/chat-tools.service.js';
import { GeminiProvider } from './ai/providers/gemini.provider.js';
import { MockProvider } from './ai/providers/mock.provider.js';
import { ChatSchedulerService } from './cron/chat-scheduler.service.js';

/**
 * ChatModule — real-time chat with AI (Gemini) + scenarios + scheduler.
 *
 * AI stack:
 *  - AiService: orchestrator (scenario fast-path → provider → tool loop)
 *  - GeminiProvider: Google Generative AI wrapper (function calling)
 *  - MockProvider: canned responses (dev + fallback khi API fail)
 *  - ChatToolsService: query Product/Order/Faq/Promotion cho AI
 *
 * TypeOrmModule.forFeature tren dang ky Product/Order/Faq/Promotion repos
 * de ChatToolsService co the inject truc tiep, thay vi phu thuoc
 * vao ProductsService/OrdersService (tranh forwardRef phuc tap).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ChatMessage,
      ChatSchedule,
      ChatScenario,
      // Audit log cho AI tool calls — insert-only, khong expose ra API
      ChatToolCall,
      // Gateway can query User de verify JWT role (agent/admin/customer-user)
      User,
      // AI tools can query du lieu catalog/order/faq/promotion
      Product,
      Order,
      OrderItem,
      Faq,
      Promotion,
    ]),
    // InventoryModule exports InventoryService — ChatTools dung de lay stock thuc
    InventoryModule,
    // JwtModule rieng cho Gateway — verify access token tu socket handshake.
    // Khong tai su dung JwtModule cua AuthModule de tranh circular dependency.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('jwt.accessSecret');
        if (!secret) {
          throw new Error('[ChatModule] jwt.accessSecret is not configured');
        }
        return { secret };
      },
    }),
  ],
  controllers: [
    ChatController,
    ChatSchedulesController,
    ChatScenariosController,
  ],
  providers: [
    ChatService,
    ChatSchedulesService,
    ChatScenariosService,
    ChatGateway,
    AiService,
    ChatToolsService,
    GeminiProvider,
    MockProvider,
    ChatSchedulerService,
  ],
  exports: [ChatService, ChatGateway, AiService],
})
export class ChatModule {}
