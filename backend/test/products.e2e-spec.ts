import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { UsersModule } from '../src/modules/users/users.module.js';
import { ProductsModule } from '../src/modules/products/products.module.js';
import { CategoriesModule } from '../src/modules/categories/categories.module.js';
import {
  createTestModule,
  createTestUser,
  authHeader,
  cleanDatabase,
  closeTestApp,
} from './setup.js';

describe('Products (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let categoryId: string;

  beforeAll(async () => {
    const result = await createTestModule([
      AuthModule,
      UsersModule,
      ProductsModule,
      CategoriesModule,
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

    // Tao category de test product
    const catRes = await request(app.getHttpServer())
      .post('/api/categories')
      .set(authHeader(adminToken))
      .send({ name: 'Electronics', description: 'Electronic devices' });

    categoryId = catRes.body?.data?.id;
  });

  afterEach(async () => {
    await cleanDatabase(app);
  });

  // ==========================================
  // Helper: tao product
  // ==========================================
  async function createProduct(overrides: Record<string, any> = {}) {
    const defaults = {
      name: 'Test Product',
      description: 'A great product for testing',
      price: 199.99,
      compare_price: 249.99,
      sku: `SKU-${Date.now()}`,
      stock: 100,
      category_id: categoryId,
      is_featured: false,
      images: ['https://cdn.example.com/test.jpg'],
    };

    const res = await request(app.getHttpServer())
      .post('/api/products')
      .set(authHeader(adminToken))
      .send({ ...defaults, ...overrides });

    return res.body?.data;
  }

  // ==========================================
  // GET /api/products
  // ==========================================
  describe('GET /api/products', () => {
    it('should return product list (public)', async () => {
      await createProduct();
      await createProduct({ name: 'Second Product', sku: 'SKU-2' });

      const res = await request(app.getHttpServer())
        .get('/api/products')
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products?page=1&limit=5')
        .expect(200);

      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('page');
    });

    it('should filter by category', async () => {
      await createProduct();

      const res = await request(app.getHttpServer())
        .get(`/api/products?category=${categoryId}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should support search', async () => {
      await createProduct({ name: 'iPhone 15 Pro' });

      const res = await request(app.getHttpServer())
        .get('/api/products?search=iPhone')
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  // ==========================================
  // POST /api/products
  // ==========================================
  describe('POST /api/products', () => {
    it('should create product as admin', async () => {
      const product = await createProduct({ name: 'New Product' });

      expect(product).toHaveProperty('id');
      expect(product.name).toBe('New Product');
      expect(product.slug).toBe('new-product');
      expect(product.price).toBe(199.99);
    });

    it('should auto-generate slug from name', async () => {
      const product = await createProduct({ name: 'iPhone 15 Pro Max 256GB' });
      expect(product.slug).toMatch(/iphone-15-pro-max-256gb/);
    });

    it('should reject negative price', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .set(authHeader(adminToken))
        .send({
          name: 'Negative Price',
          price: -10,
          sku: 'NEG-001',
          stock: 10,
        })
        .expect(400);
    });

    it('should reject duplicate SKU', async () => {
      await createProduct({ sku: 'UNIQUE-SKU' });

      await request(app.getHttpServer())
        .post('/api/products')
        .set(authHeader(adminToken))
        .send({
          name: 'Duplicate SKU',
          price: 100,
          sku: 'UNIQUE-SKU',
          stock: 10,
        })
        .expect(409);
    });

    it('should reject non-admin', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .set(authHeader(userToken))
        .send({
          name: 'Unauthorized Product',
          price: 100,
          sku: 'UNAUTH-001',
          stock: 10,
        })
        .expect(403);
    });
  });

  // ==========================================
  // GET /api/products/:id
  // ==========================================
  describe('GET /api/products/:id', () => {
    it('should get product by ID', async () => {
      const product = await createProduct();

      const res = await request(app.getHttpServer())
        .get(`/api/products/${product.id}`)
        .expect(200);

      expect(res.body.data.id).toBe(product.id);
      expect(res.body.data.name).toBe(product.name);
    });

    it('should return 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .get('/api/products/non-existent-id')
        .expect(404);
    });
  });

  // ==========================================
  // GET /api/products/slug/:slug
  // ==========================================
  describe('GET /api/products/slug/:slug', () => {
    it('should get product by slug', async () => {
      const product = await createProduct({ name: 'Slug Test Product' });

      const res = await request(app.getHttpServer())
        .get('/api/products/slug/slug-test-product')
        .expect(200);

      expect(res.body.data.id).toBe(product.id);
    });
  });

  // ==========================================
  // GET /api/products/featured
  // ==========================================
  describe('GET /api/products/featured', () => {
    it('should return only featured products', async () => {
      await createProduct({ name: 'Featured', is_featured: true, sku: 'F-1' });
      await createProduct({
        name: 'Not Featured',
        is_featured: false,
        sku: 'NF-1',
      });

      const res = await request(app.getHttpServer())
        .get('/api/products/featured')
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      res.body.data.forEach((p: any) => {
        expect(p.is_featured).toBe(true);
      });
    });
  });

  // ==========================================
  // PATCH /api/products/:id
  // ==========================================
  describe('PATCH /api/products/:id', () => {
    it('should update product as admin', async () => {
      const product = await createProduct();

      const res = await request(app.getHttpServer())
        .patch(`/api/products/${product.id}`)
        .set(authHeader(adminToken))
        .send({ name: 'Updated Product', price: 299.99 })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Product');
      expect(res.body.data.price).toBe(299.99);
    });
  });

  // ==========================================
  // DELETE /api/products/:id
  // ==========================================
  describe('DELETE /api/products/:id', () => {
    it('should soft delete product as admin', async () => {
      const product = await createProduct();

      await request(app.getHttpServer())
        .delete(`/api/products/${product.id}`)
        .set(authHeader(adminToken))
        .expect(200);

      // Product should no longer appear in list
      const res = await request(app.getHttpServer())
        .get(`/api/products/${product.id}`)
        .expect(404);
    });
  });

  // ==========================================
  // Variants
  // ==========================================
  describe('Product Variants', () => {
    it('should create product with variants', async () => {
      const product = await createProduct({
        name: 'Product With Variants',
        sku: 'VAR-001',
        variants: [
          { name: 'Size S', sku: 'VAR-001-S', price: 199.99, stock: 20 },
          { name: 'Size M', sku: 'VAR-001-M', price: 209.99, stock: 30 },
          { name: 'Size L', sku: 'VAR-001-L', price: 219.99, stock: 25 },
        ],
      });

      expect(product.variants).toBeInstanceOf(Array);
      expect(product.variants.length).toBe(3);
    });
  });
});
