import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create 4 chat tables — conversations, chat_messages, chat_schedules, chat_scenarios.
 *
 * - conversations: phien chat giua khach va AI/agent
 * - chat_messages: noi dung tung message, FK cascade delete voi conversation
 * - chat_schedules: gio lam viec quyet dinh AI/HUMAN/HYBRID/OFFLINE mode
 * - chat_scenarios: template tra loi tu dong theo trigger
 */
export class CreateChatTables1713484800000 implements MigrationInterface {
  name = 'CreateChatTables1713484800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- conversations ----
    await queryRunner.query(`
      CREATE TABLE \`conversations\` (
        \`id\` CHAR(26) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL,
        \`channel\` ENUM('web','mobile','zalo','facebook') NOT NULL DEFAULT 'web',
        \`status\` ENUM('open','waiting_agent','with_agent','with_ai','closed') NOT NULL DEFAULT 'open',
        \`mode\` ENUM('ai','human','hybrid','offline') NOT NULL DEFAULT 'ai',
        \`subject\` VARCHAR(255) NULL,
        \`customerId\` CHAR(26) NULL,
        \`customerName\` VARCHAR(100) NULL,
        \`customerEmail\` VARCHAR(255) NULL,
        \`customerPhone\` VARCHAR(20) NULL,
        \`agentId\` CHAR(26) NULL,
        \`lastMessageAt\` DATETIME NULL,
        \`lastMessagePreview\` TEXT NULL,
        \`unreadByAgent\` INT NOT NULL DEFAULT 0,
        \`unreadByCustomer\` INT NOT NULL DEFAULT 0,
        \`metadata\` JSON NULL,
        \`tags\` TEXT NULL,
        \`rating\` INT NULL,
        \`feedback\` TEXT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_conversations_status\` (\`status\`),
        INDEX \`IDX_conversations_customerId\` (\`customerId\`),
        INDEX \`IDX_conversations_agentId\` (\`agentId\`),
        INDEX \`IDX_conversations_lastMessageAt\` (\`lastMessageAt\`),
        INDEX \`IDX_conversations_status_lastMessageAt\` (\`status\`, \`lastMessageAt\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // ---- chat_messages ----
    await queryRunner.query(`
      CREATE TABLE \`chat_messages\` (
        \`id\` CHAR(26) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL,
        \`conversationId\` CHAR(26) NOT NULL,
        \`role\` ENUM('user','ai','agent','system') NOT NULL,
        \`type\` ENUM('text','image','product_card','order_card','quick_replies','system_event') NOT NULL DEFAULT 'text',
        \`content\` TEXT NOT NULL,
        \`senderName\` VARCHAR(100) NULL,
        \`senderId\` CHAR(26) NULL,
        \`attachments\` JSON NULL,
        \`metadata\` JSON NULL,
        \`readAt\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_chat_messages_conversationId\` (\`conversationId\`),
        INDEX \`IDX_chat_messages_conv_created\` (\`conversationId\`, \`created_at\`),
        CONSTRAINT \`FK_chat_messages_conversation\`
          FOREIGN KEY (\`conversationId\`) REFERENCES \`conversations\`(\`id\`)
          ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // ---- chat_schedules ----
    await queryRunner.query(`
      CREATE TABLE \`chat_schedules\` (
        \`id\` CHAR(26) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`dayOfWeek\` INT NULL,
        \`startTime\` VARCHAR(5) NOT NULL,
        \`endTime\` VARCHAR(5) NOT NULL,
        \`mode\` ENUM('ai','human','hybrid','offline') NOT NULL,
        \`timezone\` VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        \`priority\` INT NOT NULL DEFAULT 0,
        \`isActive\` TINYINT(1) NOT NULL DEFAULT 1,
        \`fallbackMessage\` TEXT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // ---- chat_scenarios ----
    await queryRunner.query(`
      CREATE TABLE \`chat_scenarios\` (
        \`id\` CHAR(26) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`triggerType\` ENUM('keyword','intent','event','scheduled') NOT NULL,
        \`triggerValue\` VARCHAR(500) NOT NULL,
        \`conditions\` JSON NULL,
        \`response\` TEXT NOT NULL,
        \`responseType\` ENUM('text','image','product_card','order_card','quick_replies','system_event') NOT NULL DEFAULT 'text',
        \`followUpScenarioId\` CHAR(26) NULL,
        \`delayMinutes\` INT NOT NULL DEFAULT 0,
        \`priority\` INT NOT NULL DEFAULT 0,
        \`isActive\` TINYINT(1) NOT NULL DEFAULT 1,
        \`matchCount\` INT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Thu tu drop nguoc lai — chat_messages co FK, drop truoc conversations
    await queryRunner.query(`DROP TABLE IF EXISTS \`chat_scenarios\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`chat_schedules\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`chat_messages\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`conversations\``);
  }
}
