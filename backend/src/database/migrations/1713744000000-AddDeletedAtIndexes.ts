import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: them index `deleted_at` cho tat ca table dung BaseEntity (soft delete).
 *
 * Ly do: BaseService.findAll() luon co dieu kien `WHERE deleted_at IS NULL`.
 * Khi table lon (1M+ rows), khong co index gay full table scan moi list query.
 *
 * Note: skip nhung table khong co soft delete (vd refresh_tokens) hoac da co
 * composite index bao gom deleted_at (vd trong cart_items).
 */
export class AddDeletedAtIndexes1713744000000 implements MigrationInterface {
  name = 'AddDeletedAtIndexes1713744000000';

  private readonly tables = [
    'api_keys',
    'articles',
    'cart',
    'categories',
    'chat_messages',
    'chat_scenarios',
    'chat_schedules',
    'chat_tool_calls',
    'conversations',
    'contacts',
    'email_templates',
    'faqs',
    'feature_flags',
    'locales',
    'translations',
    'inventory',
    'media',
    'navigations',
    'navigation_items',
    'notifications',
    'order_items',
    'orders',
    'pages',
    'payments',
    'plans',
    'subscriptions',
    'product_attributes',
    'product_variants',
    'products',
    'promotions',
    'reviews',
    'settings',
    'tenants',
    'users',
    'webhooks',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      try {
        // Check ton tai bang truoc khi them index
        const exists = await queryRunner.query(
          `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
          [table],
        );
        if (!exists.length) continue;

        // Skip neu da co index tren deleted_at
        const idxExists = await queryRunner.query(
          `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
           AND COLUMN_NAME = 'deleted_at' AND SEQ_IN_INDEX = 1`,
          [table],
        );
        if (idxExists.length) continue;

        await queryRunner.query(
          `CREATE INDEX \`IDX_${table}_deleted_at\` ON \`${table}\` (\`deleted_at\`)`,
        );
      } catch (err) {
        // Log nhung tiep tuc — 1 table loi khong block toan bo migration
        console.warn(
          `[migration] Could not add deleted_at index on ${table}: ${(err as Error).message}`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      try {
        await queryRunner.query(
          `DROP INDEX \`IDX_${table}_deleted_at\` ON \`${table}\``,
        );
      } catch {
        // Bo qua neu index khong ton tai
      }
    }
  }
}
