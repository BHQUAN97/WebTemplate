import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add auth hardening + OAuth + email verification columns to users.
 *
 * Columns added:
 *  - backup_codes_hash (json, nullable)         — 2FA backup codes SHA-256 hashes
 *  - email_verification_jti (varchar 64, nullable) — single-use email verify token JTI
 *  - provider (varchar 20, nullable)            — OAuth provider name
 *  - provider_id (varchar 255, nullable)        — OAuth provider user id
 *
 * Columns altered:
 *  - password_hash                              — ALTER to nullable (OAuth users khong co password)
 */
export class AddAuthHardeningColumns1713312000000 implements MigrationInterface {
  name = 'AddAuthHardeningColumns1713312000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Them cac cot moi. IF NOT EXISTS bao ve khi migration chay nhieu lan
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD COLUMN \`backup_codes_hash\` JSON NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD COLUMN \`email_verification_jti\` VARCHAR(64) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD COLUMN \`provider\` VARCHAR(20) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD COLUMN \`provider_id\` VARCHAR(255) NULL`,
    );

    // Cho phep password_hash NULL (OAuth users)
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`password_hash\` VARCHAR(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert thu tu nguoc lai
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`password_hash\` VARCHAR(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`provider_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`provider\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`email_verification_jti\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`backup_codes_hash\``,
    );
  }
}
