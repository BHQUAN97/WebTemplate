import { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity.js';
import { UserRole } from '../../common/constants/index.js';
import { hashPassword } from '../../common/utils/hash.js';
import { generateUlid } from '../../common/utils/ulid.js';

/**
 * Seed admin user mac dinh.
 * Chay: npx ts-node src/database/seeds/admin-seed.ts
 */
async function seedAdmin() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '6002', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'webtemplate',
    entities: [User],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('Database connected');

  const userRepo = dataSource.getRepository(User);

  // Kiem tra admin da ton tai chua
  const existing = await userRepo.findOne({
    where: { email: 'admin@webtemplate.com' },
  });

  if (existing) {
    console.log('Admin user already exists, skipping seed');
    await dataSource.destroy();
    return;
  }

  const passwordHash = await hashPassword('Admin@123');

  const admin = userRepo.create({
    id: generateUlid(),
    email: 'admin@webtemplate.com',
    password_hash: passwordHash,
    name: 'Admin',
    role: UserRole.ADMIN,
    is_active: true,
    is_email_verified: true,
  });

  await userRepo.save(admin);
  console.log('Admin user created: admin@webtemplate.com / Admin@123');

  await dataSource.destroy();
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
