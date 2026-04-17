import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { UsersModule } from '../src/modules/users/users.module.js';
import { ProductsModule } from '../src/modules/products/products.module.js';
import { CategoriesModule } from '../src/modules/categories/categories.module.js';
import { CartModule } from '../src/modules/cart/cart.module.js';
import { OrdersModule } from '../src/modules/orders/orders.module.js';
import { InventoryModule } from '../src/modules/inventory/inventory.module.js';
import {
  createTestModule,
  createTestUser,
  authHeader,
  cleanDatabase,
  closeTestApp,
} from './setup.js';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let productId: string;

  beforeAll(async () => {
    const result = await createTestModule([
      AuthModule,
      UsersModule,
      ProductsModule,
      CategoriesModule,
      CartModule,
      OrdersModule,
      InventoryModule,
    ]);
    app = result.app;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    const admin = await createTestUser(app, 'admin');
    adminToken = admin.token;

    const user = await createTestUser(app, 'user');
    userToken = user.token;

    // Tao product de test
    const prodRes = await request(app.getHttpServer())
      .post('/api/products')
      .set(authHeader(adminToken))
      .send({
        name: 'Order Test Product',
        price: 150000,
        sku: `SKU-${Date.now()}`,
        stock: 50,
      });

    productId = prodRes.body?.data?.id;
  });

  afterEach(async () => {
    await cleanDatabase(app);
  });

  // Helper: them san pham vao cart
  async function addToCart() {
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set(authHeader(userToken))
      .send({
        product_id: productId,
        quantity: 2,
      });
  }

  // Helper: tao order tu cart
  async function createOrder() {
    await addToCart();

    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set(authHeader(userToken))
      .send({
        shipping_address: {
          name: 'Nguyen Van A',
          phone: '0901234567',
          address: '123 Le Loi, Quan 1',
          city: 'Ho Chi Minh',
          province: 'HCM',
        },
        payment_method: 'cod',
        note: 'Giao buoi sang',
      });

    return res.body?.data;
  }

  // ==========================================
  // POST /api/orders
  // ==========================================
  describe('POST /api/orders', () => {
    it('should create order from cart', async () => {
      const order = await createOrder();

      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('order_number');
      expect(order.status).toBe('pending');
      expect(order.items).toBeInstanceOf(Array);
      expect(order.items.length).toBe(1);
      expect(order.total).toBe(300000); // 150000 * 2
    });

    it('should generate unique order number', async () => {
      const order1 = await createOrder();

      // Clean cart and create another
      await cleanDatabase(app);
      const user2 = await createTestUser(app, 'user');
      userToken = user2.token;

      const admin2 = await createTestUser(app, 'admin');
      adminToken = admin2.token;

      // Create new product
      const prodRes = await request(app.getHttpServer())
        .post('/api/products')
        .set(authHeader(adminToken))
        .send({
          name: 'Another Product',
          price: 100000,
          sku: `SKU-${Date.now()}-2`,
          stock: 50,
        });
      productId = prodRes.body?.data?.id;

      const order2 = await createOrder();

      if (order1 && order2) {
        expect(order1.order_number).not.toBe(order2.order_number);
      }
    });

    it('should reject order with empty cart', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .set(authHeader(userToken))
        .send({
          shipping_address: {
            name: 'Test',
            phone: '0901234567',
            address: '123 Test',
            city: 'HCM',
            province: 'HCM',
          },
          payment_method: 'cod',
        })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          shipping_address: { name: 'Test' },
          payment_method: 'cod',
        })
        .expect(401);
    });
  });

  // ==========================================
  // GET /api/orders
  // ==========================================
  describe('GET /api/orders', () => {
    it('should list user own orders', async () => {
      await createOrder();

      const res = await request(app.getHttpServer())
        .get('/api/orders')
        .set(authHeader(userToken))
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should list all orders for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/orders')
        .set(authHeader(adminToken))
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  // ==========================================
  // PATCH /api/orders/:id/status
  // ==========================================
  describe('PATCH /api/orders/:id/status', () => {
    it('should update order status as admin', async () => {
      const order = await createOrder();
      if (!order) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .set(authHeader(adminToken))
        .send({
          status: 'confirmed',
          note: 'Da xac nhan don hang',
        })
        .expect(200);

      expect(res.body.data.status).toBe('confirmed');
    });

    it('should reject invalid status transition', async () => {
      const order = await createOrder();
      if (!order) return;

      // Cannot go from pending directly to delivered
      await request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .set(authHeader(adminToken))
        .send({ status: 'delivered' })
        .expect(400);
    });

    it('should reject non-admin status update', async () => {
      const order = await createOrder();
      if (!order) return;

      await request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .set(authHeader(userToken))
        .send({ status: 'confirmed' })
        .expect(403);
    });
  });

  // ==========================================
  // POST /api/orders/:id/cancel
  // ==========================================
  describe('POST /api/orders/:id/cancel', () => {
    it('should cancel own pending order', async () => {
      const order = await createOrder();
      if (!order) return;

      const res = await request(app.getHttpServer())
        .post(`/api/orders/${order.id}/cancel`)
        .set(authHeader(userToken))
        .send({ reason: 'Doi y khong mua' })
        .expect(200);

      expect(res.body.data.status).toBe('cancelled');
    });

    it('should not cancel already shipped order', async () => {
      const order = await createOrder();
      if (!order) return;

      // Move to shipped status (admin)
      await request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .set(authHeader(adminToken))
        .send({ status: 'confirmed' });

      await request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .set(authHeader(adminToken))
        .send({ status: 'processing' });

      await request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .set(authHeader(adminToken))
        .send({ status: 'shipped' });

      // Try to cancel shipped order
      await request(app.getHttpServer())
        .post(`/api/orders/${order.id}/cancel`)
        .set(authHeader(userToken))
        .send({ reason: 'Too late' })
        .expect(400);
    });
  });
});
