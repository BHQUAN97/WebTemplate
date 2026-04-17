import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import {
  getDatabaseConfig,
  appConfig,
  jwtConfig,
  storageConfig,
  redisConfig,
  oauthConfig,
  aiConfig,
} from './config/index.js';
import { QueueModule } from './common/queue/queue.module.js';
import { DeadLetterModule } from './common/queue/dead-letter.module.js';
import { CronModule } from './common/cron/cron.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { TenantGuard } from './common/guards/tenant.guard.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { CustomValidationPipe } from './common/pipes/validation.pipe.js';
// Core modules (BAT BUOC — khong the tat)
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { LogsModule } from './modules/logs/logs.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';

// Content modules
import { MediaModule } from './modules/media/media.module.js';
import { ArticlesModule } from './modules/articles/articles.module.js';
import { PagesModule } from './modules/pages/pages.module.js';
import { NavigationModule } from './modules/navigation/navigation.module.js';
import { SeoModule } from './modules/seo/seo.module.js';

// E-commerce modules
import { ProductsModule } from './modules/products/products.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { CartModule } from './modules/cart/cart.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { PromotionsModule } from './modules/promotions/promotions.module.js';

// Communication modules
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ContactsModule } from './modules/contacts/contacts.module.js';
import { FaqModule } from './modules/faq/faq.module.js';
import { ChatModule } from './modules/chat/chat.module.js';

// Analytics & utilities
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { ExportImportModule } from './modules/export-import/export-import.module.js';
import { I18nModule } from './modules/i18n/i18n.module.js';

// SaaS modules
import { TenantsModule } from './modules/tenants/tenants.module.js';
import { PlansModule } from './modules/plans/plans.module.js';
import { ApiKeysModule } from './modules/api-keys/api-keys.module.js';
import { WebhooksModule } from './modules/webhooks/webhooks.module.js';
import { EmailTemplatesModule } from './modules/email-templates/email-templates.module.js';

// Infrastructure modules
import { HealthModule } from './modules/health/health.module.js';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module.js';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module.js';

// Reports — admin export PDF/XLSX/CSV
import { ReportsModule } from './modules/reports/reports.module.js';

// Export — generic CSV/XLSX cho arbitrary data tu FE
import { ExportModule } from './modules/export/export.module.js';

// Mail — wrapper cao cap quanh email queue + settings.enabled flag
import { MailModule } from './modules/mail/mail.module.js';

@Module({
  imports: [
    // Sentry error tracking — chi active neu SENTRY_DSN set (xem instrument.ts)
    SentryModule.forRoot(),
    // Config global — doc .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [
        appConfig,
        jwtConfig,
        storageConfig,
        redisConfig,
        oauthConfig,
        aiConfig,
      ],
    }),

    // TypeORM — ket noi MySQL
    TypeOrmModule.forRoot(getDatabaseConfig()),

    // Rate limiting — gioi han so request/phut de bao ve API
    // Default: 60 req/phut. Auth routes: 10 req/15 phut (apply @Throttle decorator)
    // NOTE: Auth controller can apply @Throttle({ auth: { limit: 5, ttl: 900000 } })
    //       cho cac route: login, register, refresh, forgot-password (agent khac handle)
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 60,
      },
      {
        name: 'auth',
        ttl: 900000, // 15 phut
        limit: 10,
      },
    ]),

    // BullMQ — background queues (email, webhook, media processing)
    // Ket noi den Redis giong cache, nhung co the dung db rieng qua REDIS_DB
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password') || undefined,
          db: config.get<number>('redis.db') ?? 0,
          maxRetriesPerRequest: null,
        },
      }),
      inject: [ConfigService],
    }),

    // ScheduleModule — cho phep @Cron decorator chay (audit cleanup, webhook retry...)
    ScheduleModule.forRoot(),

    // Redis client (global) — account lockout, rate limit, session caching
    // Nap som de cac module khac (Auth, Users) co the inject REDIS_CLIENT
    RedisModule,

    // Register tat ca queue — global de moi module khac @InjectQueue duoc
    QueueModule,

    // Dead letter queue (global) — luu cac job fail vinh vien de admin review
    DeadLetterModule,

    // === Core modules (BAT BUOC) ===
    AuthModule,
    UsersModule,
    SettingsModule,
    LogsModule,
    CategoriesModule,

    // === Content / CMS ===
    MediaModule,
    ArticlesModule,
    PagesModule,
    NavigationModule,
    SeoModule,

    // === E-commerce ===
    ProductsModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ReviewsModule,
    PromotionsModule,

    // === Communication ===
    NotificationsModule,
    ContactsModule,
    FaqModule,
    ChatModule,

    // === Analytics & Utilities ===
    AnalyticsModule,
    SearchModule,
    ExportImportModule,
    I18nModule,

    // === SaaS ===
    TenantsModule,
    PlansModule,
    ApiKeysModule,
    WebhooksModule,
    EmailTemplatesModule,

    // === Infrastructure ===
    HealthModule,
    AuditLogsModule,
    FeatureFlagsModule,

    // === Reports (PDF/XLSX/CSV) ===
    ReportsModule,
    ExportModule,

    // === Mail wrapper (global) ===
    MailModule,

    // === Cron jobs — phai nap SAU tat ca module ma cron depend (Settings, Reports...) ===
    CronModule,
  ],
  providers: [
    // Sentry exception capture — PHAI dang ky TRUOC AllExceptionsFilter
    // de Sentry thay exception truoc khi bi format thanh response
    { provide: APP_FILTER, useClass: SentryGlobalFilter },

    // Global guards — JWT auth + role-based access + tenant isolation + rate limiting
    // Order: JwtAuth -> Roles -> Tenant -> Throttler
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Global interceptors — response transform + logging
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },

    // Global exception filter
    { provide: APP_FILTER, useClass: AllExceptionsFilter },

    // Global validation pipe
    { provide: APP_PIPE, useClass: CustomValidationPipe },
  ],
})
export class AppModule {}
