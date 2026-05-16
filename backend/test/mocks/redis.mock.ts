import { Global, Module } from '@nestjs/common';
import { REDIS_CLIENT } from '../../src/common/redis/redis.module.js';

/**
 * In-memory Redis mock dung cho e2e tests.
 * Simulate get/incr/expire/del/ttl cho account lockout + token ops.
 */
export function createRedisMock() {
  const store = new Map<string, { val: string; expiresAt: number | null }>();
  return {
    get: jest.fn(async (key: string) => {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.val;
    }),
    set: jest.fn(async (key: string, val: string) => {
      store.set(key, { val, expiresAt: null });
      return 'OK';
    }),
    incr: jest.fn(async (key: string) => {
      const entry = store.get(key);
      const newVal = entry ? parseInt(entry.val) + 1 : 1;
      store.set(key, { val: String(newVal), expiresAt: entry?.expiresAt ?? null });
      return newVal;
    }),
    expire: jest.fn(async (key: string, ttl: number) => {
      const entry = store.get(key);
      if (entry) {
        store.set(key, { val: entry.val, expiresAt: Date.now() + ttl * 1000 });
      }
      return 1;
    }),
    ttl: jest.fn(async (key: string) => {
      const entry = store.get(key);
      if (!entry || entry.expiresAt === null) return -1;
      const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key);
      return 1;
    }),
    quit: jest.fn(async () => 'OK'),
    disconnect: jest.fn(),
    _clear: () => store.clear(),
  };
}

export type RedisMock = ReturnType<typeof createRedisMock>;

/**
 * Global mock module — thay the RedisModule trong test environment.
 * Phai import truoc cac module khac dung REDIS_CLIENT.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => createRedisMock(),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class MockRedisModule {}
