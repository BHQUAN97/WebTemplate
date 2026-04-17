import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ChatScenario } from '../../modules/chat/entities/chat-scenario.entity.js';
import { ChatSchedule } from '../../modules/chat/entities/chat-schedule.entity.js';
import { seedChat } from './chat.seed.js';

/**
 * Runner doc lap cho chat seed.
 * Chay: npm run seed:chat (hoac npx ts-node src/database/seeds/chat-runner.ts)
 *
 * Dung DataSource rieng (khong lazy-load entity toan bo) de chay nhanh,
 * khong can build backend truoc.
 */
async function run(): Promise<void> {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '6002', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'webtemplate',
    entities: [ChatScenario, ChatSchedule],
    synchronize: false,
    timezone: '+07:00',
  });

  await dataSource.initialize();
  console.log('[chat-runner] Database connected');

  try {
    await seedChat(dataSource);
    console.log('[chat-runner] Done');
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error('[chat-runner] Seed failed:', err);
  process.exit(1);
});
