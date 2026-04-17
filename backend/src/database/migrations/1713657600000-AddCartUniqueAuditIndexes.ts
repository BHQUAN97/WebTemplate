import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: them indexes phong race + tang query speed.
 *
 * 1. cart_items: composite UNIQUE (cart_id, product_id, variant_id) — chong race
 *    khi 2 request cung add → 2 row duplicate. variant_id co the NULL.
 *    Note: MySQL coi 2 NULL la KHONG bang nhau trong UNIQUE → can dung
 *    expression COALESCE qua generated column hoac dua application logic xu ly.
 *    Day chi them functional unique cho NON-NULL variant; con NULL variant van
 *    co rui ro race nho — application code da co try/catch ER_DUP_ENTRY fallback.
 *
 * 2. audit_logs: composite indexes user activity + resource history queries.
 */
export class AddCartUniqueAuditIndexes1713657600000
  implements MigrationInterface
{
  name = 'AddCartUniqueAuditIndexes1713657600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Cart unique — su dung COALESCE de NULL variant_id duoc treat la unique nhau
    // MySQL 8.0+ ho tro functional indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX \`UQ_cart_items_cart_product_variant\`
      ON \`cart_items\` (\`cart_id\`, \`product_id\`, (COALESCE(\`variant_id\`, '__NULL__')))
    `);

    // 2) Audit log composite indexes
    await queryRunner.query(`
      CREATE INDEX \`IDX_audit_logs_user_created\`
      ON \`audit_logs\` (\`user_id\`, \`created_at\`)
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_audit_logs_resource_created\`
      ON \`audit_logs\` (\`resource_type\`, \`resource_id\`, \`created_at\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_audit_logs_resource_created\` ON \`audit_logs\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_audit_logs_user_created\` ON \`audit_logs\``,
    );
    await queryRunner.query(
      `DROP INDEX \`UQ_cart_items_cart_product_variant\` ON \`cart_items\``,
    );
  }
}
