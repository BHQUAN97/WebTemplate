import { DataSource } from 'typeorm';
import { UserRole } from '../../common/constants/index.js';
import { hashPassword } from '../../common/utils/hash.js';
import { generateUlid } from '../../common/utils/ulid.js';

/**
 * Seed admin user mac dinh.
 * Dung raw SQL de tranh TypeORM metadata issues.
 */
async function seedAdmin() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '6002', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'webtemplate',
  });

  await dataSource.initialize();
  console.log('Database connected');

  // Kiem tra admin da ton tai chua
  const [existing] = await dataSource.query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    ['admin@webtemplate.com']
  );

  if (existing) {
    console.log('Admin user already exists, skipping seed');
    await dataSource.destroy();
    return;
  }

  const id = generateUlid();
  const passwordHash = await hashPassword('Admin@123');
  const now = new Date();

  await dataSource.query(
    `INSERT INTO users (id, email, password_hash, name, role, is_active, is_email_verified, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, 'admin@webtemplate.com', passwordHash, 'Admin', UserRole.ADMIN, true, true, now, now]
  );

  console.log('Admin user created: admin@webtemplate.com / Admin@123');

  await dataSource.destroy();
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
