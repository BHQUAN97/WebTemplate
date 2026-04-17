import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: create `chat_tool_calls` table — audit log cho moi AI tool call.
 *
 * Fields:
 *  - conversationId (indexed)
 *  - toolName (indexed)
 *  - args: json string truncated 2KB
 *  - result: ok/denied/error/rate_limited
 *  - errorMessage (optional)
 *  - durationMs
 *  - actorType: guest/customer/agent/admin
 *  - customerId (indexed, nullable)
 *  - created_at (indexed)
 */
export class CreateChatToolCalls1713571200000 implements MigrationInterface {
  name = 'CreateChatToolCalls1713571200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`chat_tool_calls\` (
        \`id\` CHAR(26) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL,
        \`conversationId\` CHAR(26) NOT NULL,
        \`toolName\` VARCHAR(80) NOT NULL,
        \`args\` TEXT NULL,
        \`result\` VARCHAR(20) NOT NULL,
        \`errorMessage\` VARCHAR(500) NULL,
        \`durationMs\` INT NOT NULL DEFAULT 0,
        \`actorType\` VARCHAR(20) NOT NULL,
        \`customerId\` CHAR(26) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_chat_tool_calls_conversationId\` (\`conversationId\`),
        INDEX \`IDX_chat_tool_calls_customerId\` (\`customerId\`),
        INDEX \`IDX_chat_tool_calls_conv_createdAt\` (\`conversationId\`, \`created_at\`),
        INDEX \`IDX_chat_tool_calls_tool_createdAt\` (\`toolName\`, \`created_at\`),
        INDEX \`IDX_chat_tool_calls_result_createdAt\` (\`result\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `chat_tool_calls`');
  }
}
