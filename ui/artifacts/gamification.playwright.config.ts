import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/specs',
  testMatch: 'gamification-create.spec.ts',
  timeout: 90000,
  expect: {
    timeout: 20000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'gamification-playwright-report', open: 'never' }],
    ['json', { outputFile: 'gamification-test-results/results.json' }],
    ['junit', { outputFile: 'gamification-test-results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.APP_BASE_URL ?? 'https://chickasaw-dev.playerhub.ai',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'on',
    trace: 'retain-on-failure',
  },
  outputDir: 'gamification-test-results',
});
