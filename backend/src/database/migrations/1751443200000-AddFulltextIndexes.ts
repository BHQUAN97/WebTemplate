import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thêm FULLTEXT indexes cho search service.
 * Service đã có FULLTEXT support + LIKE fallback — migration này kích hoạt fast path.
 * Nếu chạy trên DB không có bảng articles/pages thì IF EXISTS giúp migration vẫn thành công.
 */
export class AddFulltextIndexes1751443200000 implements MigrationInterface {
  name = 'AddFulltextIndexes1751443200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // products — search trên tên, mô tả ngắn, mô tả dài
    await queryRunner.query(`
      ALTER TABLE \`products\`
        ADD FULLTEXT INDEX \`ft_products\` (\`name\`, \`description\`, \`short_description\`)
    `);

    // articles — search trên tiêu đề, nội dung, tóm tắt
    await queryRunner.query(`
      ALTER TABLE \`articles\`
        ADD FULLTEXT INDEX \`ft_articles\` (\`title\`, \`content\`, \`excerpt\`)
    `);

    // pages — search trên tiêu đề và nội dung
    await queryRunner.query(`
      ALTER TABLE \`pages\`
        ADD FULLTEXT INDEX \`ft_pages\` (\`title\`, \`content\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`products\` DROP INDEX \`ft_products\``);
    await queryRunner.query(`ALTER TABLE \`articles\` DROP INDEX \`ft_articles\``);
    await queryRunner.query(`ALTER TABLE \`pages\` DROP INDEX \`ft_pages\``);
  }
}
