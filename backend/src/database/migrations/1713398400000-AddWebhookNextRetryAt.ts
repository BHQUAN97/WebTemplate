import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add `next_retry_at` column to `webhook_deliveries`.
 *
 * Purpose:
 *  - Support per-delivery exponential backoff (2/4/8/16/32 phut).
 *  - Cho phep WebhookRetryCron filter rows ready-to-retry bang index
 *    (success, next_retry_at).
 *  - Khi delivery thanh cong hoac da vuot max attempts, cot = NULL.
 *
 * Idempotent: kiem tra cot ton tai truoc khi ADD/DROP de tranh loi khi
 * run lap lai trong dev.
 */
export class AddWebhookNextRetryAt1713398400000 implements MigrationInterface {
  name = 'AddWebhookNextRetryAt1713398400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: neu cot da ton tai (entity sync / migration run truoc do) -> skip
    const hasColumn = await queryRunner.hasColumn(
      'webhook_deliveries',
      'next_retry_at',
    );
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE \`webhook_deliveries\` ADD COLUMN \`next_retry_at\` TIMESTAMP NULL`,
      );
    }

    // Composite index cho filter (success=false, next_retry_at <= NOW).
    // Su dung raw SQL + IF NOT EXISTS (MySQL 8+) de idempotent.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS \`IDX_webhook_deliveries_success_next_retry\`
         ON \`webhook_deliveries\` (\`success\`, \`next_retry_at\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS \`IDX_webhook_deliveries_success_next_retry\`
         ON \`webhook_deliveries\``,
    );

    const hasColumn = await queryRunner.hasColumn(
      'webhook_deliveries',
      'next_retry_at',
    );
    if (hasColumn) {
      await queryRunner.query(
        `ALTER TABLE \`webhook_deliveries\` DROP COLUMN \`next_retry_at\``,
      );
    }
  }
}
