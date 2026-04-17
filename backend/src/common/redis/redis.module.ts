import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * DI token cho raw ioredis client.
 * Dung thay cho @InjectRedis() de khong phu thuoc them package.
 */
export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * RedisModule — cung cap 1 ioredis client global de inject vao service khac
 * (account lockout, GDPR rate limit, caching nhe, session...).
 *
 * Ket noi dung cau hinh `redis.*` (xem `config/redis.config.ts`). Neu
 * REDIS_URL duoc set, uu tien su dung URL (handy cho managed Redis providers).
 *
 * Cau hinh: lazyConnect=false (connect ngay), maxRetriesPerRequest=null
 * (tuong thich BullMQ-style, tranh bi reject khi Redis tam disconnect).
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService): Redis => {
        const url = process.env.REDIS_URL;
        if (url) {
          return new Redis(url, {
            lazyConnect: false,
            maxRetriesPerRequest: null,
          });
        }
        return new Redis({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password') || undefined,
          db: config.get<number>('redis.db') ?? 0,
          lazyConnect: false,
          maxRetriesPerRequest: null,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
