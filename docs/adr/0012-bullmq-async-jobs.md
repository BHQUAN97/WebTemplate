# ADR-0012: BullMQ cho async jobs (email, image processing, export)

- **Status**: accepted
- **Date**: 2026-02-25
- **Tags**: async, reliability

## Context

Cac tac vu **blocking HTTP response qua lau**:
- Send email (SMTP 2-5s)
- Image processing (Sharp 1-3s per variant)
- Excel/PDF export (10s+ voi du lieu lon)
- Webhook dispatch (retry logic)
- Analytics aggregation

Neu chay synchronous → user experience cham, request timeout, server tai cao.

## Decision

**BullMQ queue** (Redis-backed) cho tat ca async task:

### Queues
- `mail` — send email (Resend API)
- `image` — Sharp resize/WebP
- `export` — Excel/PDF generation
- `webhook` — dispatch + retry
- `analytics` — aggregate metrics
- `cleanup` — scheduled (expired image, stale session)

### Pattern
```typescript
// Producer
await this.queue.add('send-order-confirmation', {
  orderId: order.id,
  email: user.email
}, { attempts: 3, backoff: { type: 'exponential' } });

// Consumer (worker)
@Processor('mail')
class MailProcessor {
  @Process('send-order-confirmation')
  async handle(job: Job) {
    await this.resend.send(...);
  }
}
```

### Config
- Concurrency per worker: 3 (image), 10 (mail)
- Retry: 3 lan, exponential backoff
- Dead letter: sau 3 fail → `failed` queue de alert

### Dashboard
- Bull Board tai `/admin/queues` (chi admin)
- Monitor active/completed/failed

## Rationale

- BullMQ = modern (thay Bull v3), TypeScript-first
- Redis da co trong stack → 0 them dependency
- Retry + dead letter built-in → reliability cao
- Concurrency adjust duoc per queue

## Consequences

### Tich cuc
- HTTP response <200ms (task off-loaded)
- Retry auto → transient error khong mat data
- Scale worker rieng (docker replica)
- Observability via Bull Board

### Tieu cuc
- Them 1 concept (queue) cho dev moi
- Eventual consistency (email co the delay vai giay)
- Worker crash = job can recover tu Redis

### Rui ro
- **Redis down = queue down** → mitigation: Redis persistence (AOF), docker restart policy
- **Job payload lon** (file binary trong job) → mitigation: store file o R2, job chi giu URL

## Alternatives Considered

### Node cron + in-memory
- **Nhuoc**: restart mat queue, khong retry

### Kafka / RabbitMQ
- **Uu**: enterprise-grade
- **Nhuoc**: over-engineer, them 1 service

### Firebase Cloud Functions
- **Uu**: managed
- **Nhuoc**: vendor lock-in

## Implementation Notes

- `backend/src/queue/` — queue definitions
- `backend/src/workers/` — processor classes
- Redis config: `maxmemory-policy noeviction` (BullMQ requirement — xem CROSS-0001)

## References

- docs/FLOWS.md "Notification Flow"
- Related: WebPhoto uses same pattern
