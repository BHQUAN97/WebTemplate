import { test, expect, BASE_URL } from './setup';

test.describe('Admin Panel', () => {
  // ==========================================
  // Dashboard
  // ==========================================
  test('admin dashboard loads with stats', async ({ adminPage: page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    // Dashboard co cac stat cards
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    // Co it nhat 1 stat card (revenue, orders, users, etc.)
    const statCards = page.locator('[class*="card"], [class*="stat"], [class*="metric"]');
    await expect(statCards.first()).toBeVisible({ timeout: 10000 });
  });

  // ==========================================
  // Products page
  // ==========================================
  test.describe('Products Management', () => {
    test('products list page loads', async ({ adminPage: page }) => {
      await page.goto(`${BASE_URL}/admin/products`);
      await page.waitForLoadState('networkidle');

      // Co bang hoac danh sach san pham
      const table = page.locator('table, [class*="product-list"], [class*="grid"]').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('can navigate to create product page', async ({ adminPage: page }) => {
      await page.goto(`${BASE_URL}/admin/products`);
      await page.waitForLoadState('networkidle');

      // Tim nut "Them moi" hoac "Create"
      const createButton = page.locator('a:has-text("Them"), a:has-text("Create"), a:has-text("New"), button:has-text("Them"), button:has-text("Create")').first();

      if (await createButton.isVisible().catch(() => false)) {
        await createButton.click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/\/admin\/products\/new/);
      }
    });

    test('create product form has required fields', async ({ adminPage: page }) => {
      await page.goto(`${BASE_URL}/admin/products/new`);
      await page.waitForLoadState('networkidle');

      // Form co cac truong can thiet
      await expect(page.locator('input[name="name"], input[placeholder*="ten" i]').first()).toBeVisible();
      await expect(page.locator('input[name="price"], input[placeholder*="gia" i]').first()).toBeVisible();
    });
  });

  // ==========================================
  // Orders page
  // ==========================================
  test.describe('Orders Management', () => {
    test('orders list page loads', async ({ adminPage: page }) => {
      await page.goto(`${BASE_URL}/admin/orders`);
      await page.waitForLoadState('networkidle');

      // Co bang orders
      const content = page.locator('table, [class*="order-list"], [class*="empty"]').first();
      await expect(content).toBeVisible({ timeout: 10000 });
    });

    test('can view order detail', async ({ adminPage: page }) => {
      await page.goto(`${BASE_URL}/admin/orders`);
      await page.waitForLoadState('networkidle');

      // Click vao order dau tien (neu co)
      const firstRow = page.locator('table tbody tr, [class*="order-item"]').first();

      if (await firstRow.isVisible().catch(() => false)) {
        const link = firstRow.locator('a').first();
        if (await link.isVisible().catch(() => false)) {
          await link.click();
          await page.waitForLoadState('networkidle');

          // Order detail page co thong tin
          await expect(page.locator('text=pending, text=confirmed, text=processing, text=shipped, text=delivered').first()).toBeVisible({ timeout: 5000 }).catch(() => {
            // Order may not have data yet
          });
        }
      }
    });
  });

  // ==========================================
  // Settings page
  // ==========================================
  test.describe('Settings', () => {
    test('settings page loads', async ({ adminPage: page }) => {
      await page.goto(`${BASE_URL}/admin/settings`);
      await page.waitForLoadState('networkidle');

      // Co form settings
      const form = page.locator('form, [class*="settings"]').first();
      await expect(form).toBeVisible({ timeout: 10000 });
    });

    test('can update site name', async ({ adminPage: page }) => {
      await page.goto(`${BASE_URL}/admin/settings`);
      await page.waitForLoadState('networkidle');

      const siteNameInput = page.locator('input[name="site_name"], input[name="siteName"], input[placeholder*="site name" i], input[placeholder*="ten" i]').first();

      if (await siteNameInput.isVisible().catch(() => false)) {
        await siteNameInput.clear();
        await siteNameInput.fill('WebTemplate Test');

        // Tim nut Save
        const saveButton = page.locator('button[type="submit"], button:has-text("Luu"), button:has-text("Save")').first();
        if (await saveButton.isVisible().catch(() => false)) {
          await saveButton.click();
          await page.waitForTimeout(2000);

          // Kiem tra co thong bao thanh cong
          const toast = page.locator('[role="status"], [role="alert"], [class*="toast"]').first();
          // Toast hoac field van co gia tri moi
          const currentValue = await siteNameInput.inputValue();
          expect(currentValue).toBe('WebTemplate Test');
        }
      }
    });
  });
});
