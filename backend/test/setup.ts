import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Type, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import {
  appConfig,
  jwtConfig,
  redisConfig,
  storageConfig,
} from '../src/config/index.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { MockRedisModule, createRedisMock, RedisMock } from './mocks/redis.mock.js';
import { MockMailModule } from './mocks/mail.mock.js';

export { createRedisMock };
export type { RedisMock };

/**
 * Test database config — dung MySQL dev container (port 6002).
 * Drop + sync schema truoc moi test run de dam bao isolation.
 * SQLite khong ho tro 'char' type cua ULID nen phai dung MySQL.
 */
export const testDbConfig = {
  type: 'mysql' as const,
  host: '127.0.0.1',
  port: 6002,
  username: 'webtemplate',
  password: 'devpass_4b97cc16',
  database: 'webtemplate_test',
  entities: ['src/**/*.entity.ts'],
  synchronize: true,
  dropSchema: true,
  logging: false,
};

/**
 * Tao NestJS testing module voi cac module can test.
 * Auto-import TypeORM (SQLite), ConfigModule, JwtModule.
 *
 * @param modules - Danh sach module can import
 * @returns TestingModule da compile
 *
 * @example
 * const { app, module } = await createTestModule([AuthModule, UsersModule]);
 */
export async function createTestModule(
  modules: Type<any>[],
): Promise<{ app: INestApplication; module: TestingModule }> {
  const moduleBuilder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.test', '.env'],
        load: [appConfig, jwtConfig, storageConfig, redisConfig],
      }),
      TypeOrmModule.forRoot({
        ...testDbConfig,
        autoLoadEntities: true,
      }),
      JwtModule.register({
        global: true,
        secret: 'test-access-secret',
        signOptions: { expiresIn: '15m' },
      }),
      // Mock modules phai import truoc cac feature modules
      MockRedisModule,
      MockMailModule,
      ...modules,
    ],
  });

  const module = await moduleBuilder.compile();
  const app = module.createNestApplication();

  // Cau hinh giong production
  app.use(cookieParser.default());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Wrap response giong production de test assert dung format
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();

  return { app, module };
}

/**
 * Tao user va tra ve JWT token de test authenticated routes.
 *
 * @param app - NestJS app instance
 * @param role - Role cua user ('admin' | 'user')
 * @returns Object chua user info va auth token
 */
export async function createTestUser(
  app: INestApplication,
  role: 'admin' | 'user' = 'user',
): Promise<{ id: string; email: string; token: string }> {
  const jwtService = app.get(JwtService);
  const dataSource = app.get(DataSource);

  // Tao user truc tiep trong DB
  const userId = `test-${role}-${Date.now()}`;
  const email = `${role}-${Date.now()}@test.com`;

  // Insert user vao database
  await dataSource.query(
    `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
    [userId, `Test ${role}`, email, 'hashed-password', role],
  );

  // Generate JWT token
  const token = jwtService.sign(
    { sub: userId, email, role },
    { secret: 'test-access-secret' },
  );

  return { id: userId, email, token };
}

/**
 * Tra ve auth header cho request.
 */
export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Xoa toan bo du lieu trong cac table.
 * Dung giua cac test de dam bao isolation.
 */
export async function cleanDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  const entities = dataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.query(`DELETE FROM "${entity.tableName}"`);
  }
}

/**
 * Dong tat ca connection sau khi test xong.
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  await app.close();
}
