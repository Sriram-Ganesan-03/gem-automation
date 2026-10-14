import { defineConfig } from '@playwright/test';
import { segmentTestConfig } from './tests/config/segment-test-config';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/segment-creation-smoke.spec.ts',
  timeout: 120000,
  expect: {
    timeout: 15000,
  },
  reporter: [
    ['html', { outputFolder: 'segment-creation-playwright-report', open: 'never' }],
    ['json', { outputFile: 'segment-creation-test-results/results.json' }],
    ['junit', { outputFile: 'segment-creation-test-results/junit.xml' }],
    ['list'],
  ],
  use: {
    baseURL: segmentTestConfig.baseUrl,
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'only-on-failure',
    headless: true,
  },
  outputDir: 'segment-creation-test-results',
});
