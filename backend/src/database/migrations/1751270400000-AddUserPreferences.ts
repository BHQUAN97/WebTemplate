import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: thêm column preferences (json nullable) vào bảng users.
 * Dùng để sync notification preferences qua nhiều thiết bị.
 */
export class AddUserPreferences1751270400000 implements MigrationInterface {
  name = 'AddUserPreferences1751270400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`preferences\` json NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`preferences\``,
    );
  }
}
