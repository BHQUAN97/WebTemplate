import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config cho WebTemplate frontend e2e tests.
 *
 * Chay: npx playwright test
 * UI:   npx playwright test --ui
 * Debug: npx playwright test --debug
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',

  /* Timeout cho moi test */
  timeout: 30000,

  /* Expect timeout */
  expect: {
    timeout: 5000,
  },

  /* Run tests sequentially in CI */
  fullyParallel: !process.env.CI,

  /* Fail build on CI if test.only left in code */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests */
  retries: process.env.CI ? 2 : 0,

  /* Reporter */
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],

  /* Shared settings for all projects */
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:6000',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Trace on first retry */
    trace: 'on-first-retry',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    },
  },

  /* Test projects — desktop + mobile */
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 14'],
      },
    },
    {
      name: 'Mobile Android',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],

  /* Start dev server before running tests (optional) */
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        port: 6000,
        timeout: 30000,
        reuseExistingServer: true,
      },
});
