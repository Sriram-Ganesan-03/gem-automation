import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 15000,
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.APP_BASE_URL ?? 'https://dev-portal.playpro.vip/auth/login',
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'only-on-failure',
    headless: true,
    // null viewport lets the page adopt the maximized browser window size instead of a fixed size
    viewport: null,
    launchOptions: {
      args: ['--start-maximized'],
    },
  },
  outputDir: 'test-results',
});
