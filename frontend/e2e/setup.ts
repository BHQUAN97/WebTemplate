import { test as base, expect, type Page } from '@playwright/test';

/**
 * Base URL cho tat ca test.
 */
export const BASE_URL = process.env.BASE_URL || 'http://localhost:6000';
export const API_URL = process.env.API_URL || 'http://localhost:6001/api';

/**
 * Test admin credentials — dung de login vao admin panel.
 */
export const ADMIN_CREDENTIALS = {
  email: 'admin@webtemplate.local',
  password: 'Admin@123',
};

/**
 * Test user credentials — dung de login nhu user binh thuong.
 */
export const USER_CREDENTIALS = {
  email: 'testuser@test.com',
  password: 'TestP@ss1',
};

/**
 * Custom test fixtures — mo rong Playwright test voi
 * cac trang thai da login san.
 */
type CustomFixtures = {
  /** Page da login voi admin account */
  adminPage: Page;
  /** Page da login voi user account */
  userPage: Page;
};

/**
 * Mo rong base test voi custom fixtures.
 *
 * @example
 * test('admin can see dashboard', async ({ adminPage }) => {
 *   await adminPage.goto('/admin');
 *   await expect(adminPage.locator('h1')).toContainText('Dashboard');
 * });
 */
export const test = base.extend<CustomFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as admin
    await loginAs(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await use(page);
    await context.close();
  },

  userPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as user
    await loginAs(page, USER_CREDENTIALS.email, USER_CREDENTIALS.password);
    await use(page);
    await context.close();
  },
});

export { expect };

/**
 * Login qua UI — dien form va submit.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Doi redirect sau login (ve trang chu hoac dashboard)
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 10000,
  });
}

/**
 * Seed test data qua API — goi truoc khi chay test.
 * Tao admin user, test user, sample products, categories.
 */
export async function seedTestData(): Promise<void> {
  const baseUrl = API_URL;

  try {
    // Register admin (may already exist)
    await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Admin',
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
      }),
    });

    // Register test user
    await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: USER_CREDENTIALS.email,
        password: USER_CREDENTIALS.password,
      }),
    });

    // Login as admin to create sample data
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
      }),
    });

    const { data } = await loginRes.json();
    const token = data?.accessToken;

    if (!token) return;

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Create sample category
    await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Electronics',
        description: 'Electronic devices',
      }),
    });

    // Create sample products
    const products = [
      { name: 'iPhone 15 Pro', price: 29990000, sku: 'IP15P', stock: 50, is_featured: true },
      { name: 'Samsung Galaxy S24', price: 22990000, sku: 'SGS24', stock: 30, is_featured: true },
      { name: 'MacBook Air M3', price: 32990000, sku: 'MBA-M3', stock: 20, is_featured: false },
    ];

    for (const product of products) {
      await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(product),
      });
    }

    console.log('Test data seeded successfully');
  } catch (error) {
    console.warn('Seed data failed (may already exist):', error);
  }
}
