import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tạo bảng carts + cart_items.
 * Phải chạy trước AddCartUniqueAuditIndexes.
 */
export class CreateCartTables1713570000000 implements MigrationInterface {
  name = 'CreateCartTables1713570000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Bảng carts — giỏ hàng (hỗ trợ guest session + user đăng nhập)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`carts\` (
        \`id\`         CHAR(26)    NOT NULL,
        \`user_id\`    CHAR(26)    NULL,
        \`session_id\` VARCHAR(100) NULL,
        \`status\`     ENUM('active','merged','converted','abandoned') NOT NULL DEFAULT 'active',
        \`expires_at\` TIMESTAMP   NULL,
        \`metadata\`   JSON        NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_carts_user_id\` (\`user_id\`),
        INDEX \`IDX_carts_session_id\` (\`session_id\`),
        INDEX \`IDX_carts_user_status\` (\`user_id\`, \`status\`),
        INDEX \`IDX_carts_session_status\` (\`session_id\`, \`status\`),
        INDEX \`IDX_carts_deleted_at\` (\`deleted_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Bảng cart_items — từng dòng sản phẩm trong giỏ
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`cart_items\` (
        \`id\`         CHAR(26)       NOT NULL,
        \`cart_id\`    CHAR(26)       NOT NULL,
        \`product_id\` CHAR(26)       NOT NULL,
        \`variant_id\` CHAR(26)       NULL,
        \`quantity\`   INT            NOT NULL DEFAULT 1,
        \`price\`      DECIMAL(12,2)  NOT NULL,
        \`metadata\`   JSON           NULL,
        \`created_at\` DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6)    NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_cart_items_cart_id\` (\`cart_id\`),
        INDEX \`IDX_cart_items_product_id\` (\`product_id\`),
        INDEX \`IDX_cart_items_cart_product\` (\`cart_id\`, \`product_id\`),
        INDEX \`IDX_cart_items_deleted_at\` (\`deleted_at\`),
        CONSTRAINT \`FK_cart_items_cart\` FOREIGN KEY (\`cart_id\`) REFERENCES \`carts\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`cart_items\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`carts\``);
  }
}
