import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator.js';

/**
 * Health check endpoints cho monitoring, k8s probes, load balancer.
 * Tat ca endpoints la @Public() — khong yeu cau auth.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Full health check — bao gom DB, Redis, disk va memory.
   * Dung cho monitoring dashboard hoac uptime checks.
   */
  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check (DB + Redis + disk + memory)' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.checkRedis('redis'),
      () => this.disk.checkStorage('disk', { path: process.platform === 'win32' ? 'C:\\' : '/', thresholdPercent: 0.9 }),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
    ]);
  }

  /**
   * Liveness probe — tra ve 200 neu process con song.
   * Dung cho kubernetes `livenessProbe`, khong check dependency.
   */
  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe — process is up' })
  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * Readiness probe — check DB + Redis de xac nhan app san sang nhan traffic.
   * Dung cho kubernetes `readinessProbe`.
   */
  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — DB + Redis reachable' })
  ready() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.checkRedis('redis'),
    ]);
  }

  /**
   * Custom Redis ping indicator.
   * Terminus chua cung cap san indicator cho Redis nen tu viet.
   * Tao connection tam thoi moi lan check — chi phi thap so voi request DB.
   */
  private async checkRedis(key: string): Promise<HealthIndicatorResult> {
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;
    const password = this.configService.get<string>('redis.password') || undefined;
    const db = this.configService.get<number>('redis.db') ?? 0;

    const client = new Redis({
      host,
      port,
      password,
      db,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    });

    try {
      await client.connect();
      const pong = await client.ping();
      await client.quit();
      if (pong !== 'PONG') {
        return { [key]: { status: 'down', message: 'Unexpected ping response' } };
      }
      return { [key]: { status: 'up' } };
    } catch (err) {
      try {
        client.disconnect();
      } catch {
        /* ignore */
      }
      return {
        [key]: {
          status: 'down',
          message: err instanceof Error ? err.message : 'Redis connection failed',
        },
      };
    }
  }
}
