import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { createHmac } from 'crypto';
import * as dns from 'dns';
import { Webhook } from '../../modules/webhooks/entities/webhook.entity.js';
import { WebhookDelivery } from '../../modules/webhooks/entities/webhook-delivery.entity.js';
import { QUEUE_NAMES } from './queue.module.js';

/**
 * Payload cua webhook job.
 */
export interface WebhookJobData {
  webhookId: string;
  event: string;
  payload: Record<string, any>;
}

/**
 * SSRF guard: kiem tra IP co thuoc private / loopback / link-local / multicast khong.
 * Block ranges:
 *  - 127.0.0.0/8 (loopback)
 *  - 10.0.0.0/8 (private)
 *  - 172.16.0.0/12 (private)
 *  - 192.168.0.0/16 (private)
 *  - 169.254.0.0/16 (link-local)
 *  - 0.0.0.0/8 (invalid)
 *  - ::1 (IPv6 loopback), fc00::/7 (IPv6 ULA), fe80::/10 (IPv6 link-local)
 */
export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const lower = ip.toLowerCase();

  // IPv6 checks
  if (lower.includes(':')) {
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7
    if (lower.startsWith('fe8') || lower.startsWith('fe9') ||
        lower.startsWith('fea') || lower.startsWith('feb')) return true; // fe80::/10
    // IPv4-mapped IPv6: ::ffff:a.b.c.d
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }

  // IPv4 checks
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true; // multicast + reserved
  return false;
}

/**
 * Resolve hostname va reject neu IP la private/loopback.
 * Throw error neu URL khong hop le hoac IP bi block.
 */
async function assertSafeUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Webhook URL blocked: unsupported protocol ${parsed.protocol}`);
  }
  const { hostname } = parsed;

  // Block localhost aliases truc tiep
  if (['localhost', '0.0.0.0', '127.0.0.1', '::1'].includes(hostname)) {
    throw new Error(`Webhook URL blocked: ${hostname} is loopback`);
  }

  // DNS resolve + check tat ca records
  const records = await dns.promises.lookup(hostname, { all: true });
  for (const r of records) {
    if (isPrivateIp(r.address)) {
      throw new Error(
        `Webhook URL blocked: ${hostname} resolves to private IP ${r.address}`,
      );
    }
  }
}

const MAX_RESPONSE_BYTES = 64 * 1024; // 64KB — du cho debug, tranh DoS
const FETCH_TIMEOUT_MS = 10_000;

/**
 * WebhookProcessor — deliver webhook theo queue.
 * Apply SSRF guard, HMAC signature, timeout 10s. Log moi lan thu vao WebhookDelivery.
 * Throw khi HTTP >= 400 hoac khi fetch fail de Bull retry theo policy.
 */
@Processor(QUEUE_NAMES.WEBHOOK)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepo: Repository<Webhook>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
  ) {
    super();
  }

  /**
   * Deliver 1 webhook. Log delivery vao DB du thanh cong hay that bai.
   */
  async process(job: Job<WebhookJobData>): Promise<WebhookDelivery> {
    const { webhookId, event, payload } = job.data;
    const attempt = (job.attemptsMade ?? 0) + 1;

    const webhook = await this.webhookRepo.findOne({
      where: { id: webhookId },
    });
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }
    if (!webhook.is_active) {
      this.logger.warn(`Skipping inactive webhook ${webhookId}`);
      // Log delivery nhung khong throw
      return this.saveDelivery({
        webhookId,
        event,
        payload,
        attempt,
        responseStatus: null,
        responseBody: 'Webhook inactive',
        success: false,
        durationMs: 0,
      });
    }

    const bodyStr = JSON.stringify({
      event,
      data: payload,
      timestamp: new Date().toISOString(),
    });
    const signature = createHmac('sha256', webhook.secret)
      .update(bodyStr)
      .digest('hex');

    const startTime = Date.now();
    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let success = false;
    let fetchError: Error | null = null;

    try {
      // SSRF guard truoc khi fetch
      await assertSafeUrl(webhook.url);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-Delivery': job.id || '',
          'User-Agent': 'WebTemplate-Webhook/1.0',
        },
        body: bodyStr,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      responseStatus = response.status;
      const text = await response.text();
      responseBody =
        text.length > MAX_RESPONSE_BYTES
          ? text.slice(0, MAX_RESPONSE_BYTES) + '... [truncated]'
          : text;
      success = response.ok;

      if (!success) {
        fetchError = new Error(
          `Webhook returned HTTP ${response.status}`,
        );
      }
    } catch (error: any) {
      responseBody = error.message || String(error);
      fetchError = error;
    }

    const durationMs = Date.now() - startTime;

    // Cap nhat webhook metadata
    webhook.last_triggered_at = new Date();
    if (success) {
      webhook.failure_count = 0;
    } else {
      webhook.failure_count = (webhook.failure_count || 0) + 1;
    }
    await this.webhookRepo.save(webhook);

    const delivery = await this.saveDelivery({
      webhookId,
      event,
      payload,
      attempt,
      responseStatus,
      responseBody,
      success,
      durationMs,
    });

    if (!success) {
      // Throw de Bull retry theo config
      throw fetchError || new Error('Webhook delivery failed');
    }

    return delivery;
  }

  /**
   * Luu 1 delivery record.
   */
  private async saveDelivery(args: {
    webhookId: string;
    event: string;
    payload: Record<string, any>;
    attempt: number;
    responseStatus: number | null;
    responseBody: string | null;
    success: boolean;
    durationMs: number;
  }): Promise<WebhookDelivery> {
    const delivery = this.deliveryRepo.create({
      webhook_id: args.webhookId,
      event: args.event,
      payload: { event: args.event, data: args.payload },
      response_status: args.responseStatus,
      response_body: args.responseBody,
      attempt: args.attempt,
      success: args.success,
      duration_ms: args.durationMs,
      next_retry_at: null,
    });
    return this.deliveryRepo.save(delivery);
  }
}
