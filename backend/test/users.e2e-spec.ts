import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { UsersModule } from '../src/modules/users/users.module.js';
import {
  createTestModule,
  createTestUser,
  authHeader,
  cleanDatabase,
  closeTestApp,
} from './setup.js';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    const result = await createTestModule([AuthModule, UsersModule]);
    app = result.app;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    // Tao admin va user cho moi test
    const admin = await createTestUser(app, 'admin');
    adminToken = admin.token;

    const user = await createTestUser(app, 'user');
    userToken = user.token;
    userId = user.id;
  });

  afterEach(async () => {
    await cleanDatabase(app);
  });

  // ==========================================
  // GET /api/users
  // ==========================================
  describe('GET /api/users', () => {
    it('should return user list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set(authHeader(adminToken))
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('should support pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users?page=1&limit=5')
        .set(authHeader(adminToken))
        .expect(200);

      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(5);
    });

    it('should support search by name or email', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users?search=admin')
        .set(authHeader(adminToken))
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should reject non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set(authHeader(userToken))
        .expect(403);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/api/users').expect(401);
    });
  });

  // ==========================================
  // GET /api/users/me
  // ==========================================
  describe('GET /api/users/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/me')
        .set(authHeader(userToken))
        .expect(200);

      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data).toHaveProperty('name');
      expect(res.body.data).not.toHaveProperty('password_hash');
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/api/users/me').expect(401);
    });
  });

  // ==========================================
  // PATCH /api/users/me
  // ==========================================
  describe('PATCH /api/users/me', () => {
    it('should update own profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(authHeader(userToken))
        .send({ name: 'Updated Name', phone: '0909999999' })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Name');
    });

    it('should not allow changing own role', async () => {
      await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(authHeader(userToken))
        .send({ role: 'admin' })
        .expect(400); // or ignored
    });
  });

  // ==========================================
  // POST /api/users
  // ==========================================
  describe('POST /api/users', () => {
    it('should create user as admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set(authHeader(adminToken))
        .send({
          name: 'Created User',
          email: 'created@test.com',
          password: 'TempP@ss1',
          role: 'user',
        })
        .expect(201);

      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe('created@test.com');
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set(authHeader(adminToken))
        .send({ name: 'Incomplete' })
        .expect(400);
    });

    it('should reject non-admin', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set(authHeader(userToken))
        .send({
          name: 'Unauthorized',
          email: 'unauth@test.com',
          password: 'TempP@ss1',
        })
        .expect(403);
    });
  });

  // ==========================================
  // PATCH /api/users/:id
  // ==========================================
  describe('PATCH /api/users/:id', () => {
    it('should update user as admin', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${userId}`)
        .set(authHeader(adminToken))
        .send({ name: 'Admin Updated', is_active: false })
        .expect(200);

      expect(res.body.data.name).toBe('Admin Updated');
    });

    it('should allow admin to change user role', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${userId}`)
        .set(authHeader(adminToken))
        .send({ role: 'admin' })
        .expect(200);

      expect(res.body.data.role).toBe('admin');
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .patch('/api/users/non-existent-id')
        .set(authHeader(adminToken))
        .send({ name: 'Ghost' })
        .expect(404);
    });
  });

  // ==========================================
  // DELETE /api/users/:id
  // ==========================================
  describe('DELETE /api/users/:id', () => {
    it('should soft delete user as admin', async () => {
      await request(app.getHttpServer())
        .delete(`/api/users/${userId}`)
        .set(authHeader(adminToken))
        .expect(200);

      // User should not appear in list
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set(authHeader(adminToken))
        .expect(200);

      const deletedUser = res.body.data.find((u: any) => u.id === userId);
      expect(deletedUser).toBeUndefined();
    });

    it('should reject non-admin delete', async () => {
      await request(app.getHttpServer())
        .delete(`/api/users/${userId}`)
        .set(authHeader(userToken))
        .expect(403);
    });
  });
});
