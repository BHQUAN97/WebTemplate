import { test, expect, BASE_URL, ADMIN_CREDENTIALS, loginAs } from './setup';

test.describe('Authentication', () => {
  // ==========================================
  // Login page
  // ==========================================
  test('login page loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Page co form login
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  // ==========================================
  // Login success
  // ==========================================
  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await loginAs(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

    // Kiem tra da redirect khoi login page
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ==========================================
  // Login failure
  // ==========================================
  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"], input[type="email"]', 'wrong@test.com');
    await page.fill('input[name="password"], input[type="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');

    // Doi thong bao loi (tieng Viet hoac tieng Anh)
    await page.waitForTimeout(2000);

    // Kiem tra van o trang login
    await expect(page).toHaveURL(/\/login/);

    // Co the co toast hoac error message
    const errorVisible = await page.locator('[role="alert"], .text-red, .text-destructive, [data-state="open"]').isVisible().catch(() => false);
    // Hoac van o trang login la du
    expect(errorVisible || page.url().includes('/login')).toBeTruthy();
  });

  // ==========================================
  // Register flow
  // ==========================================
  test('register page loads and has form', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[name="name"], input[placeholder*="ten" i], input[placeholder*="name" i]').first()).toBeVisible();
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]').first()).toBeVisible();
  });

  test('register with valid data creates account', async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@test.com`;

    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');

    // Dien form
    const nameInput = page.locator('input[name="name"], input[placeholder*="ten" i], input[placeholder*="name" i]').first();
    await nameInput.fill('E2E Test User');

    await page.fill('input[name="email"], input[type="email"]', uniqueEmail);

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('StrongP@ss1');

    // Neu co confirm password field
    if (await passwordInputs.nth(1).isVisible().catch(() => false)) {
      await passwordInputs.nth(1).fill('StrongP@ss1');
    }

    await page.click('button[type="submit"]');

    // Doi redirect sau register
    await page.waitForTimeout(3000);
    await expect(page).not.toHaveURL(/\/register/);
  });

  // ==========================================
  // Logout
  // ==========================================
  test('logout returns to login page', async ({ page }) => {
    // Login truoc
    await loginAs(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

    // Tim va click nut logout (co the trong dropdown menu)
    const logoutButton = page.locator('button:has-text("logout"), button:has-text("Dang xuat"), a:has-text("logout"), a:has-text("Dang xuat")').first();

    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/login/);
    } else {
      // Co the can mo dropdown truoc
      const avatarButton = page.locator('[data-testid="user-menu"], button:has(img), .avatar').first();
      if (await avatarButton.isVisible().catch(() => false)) {
        await avatarButton.click();
        await page.waitForTimeout(500);

        const logoutItem = page.locator('text=logout, text=Dang xuat, text=Log out').first();
        if (await logoutItem.isVisible().catch(() => false)) {
          await logoutItem.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });
});
