import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/specs',
  testMatch: 'qualifier-create.spec.ts',
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'qualifier-playwright-report', open: 'never' }],
    ['json', { outputFile: 'qualifier-test-results/results.json' }],
    ['junit', { outputFile: 'qualifier-test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'https://chickasaw-dev.playerhub.ai',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  outputDir: 'qualifier-test-results',
});
