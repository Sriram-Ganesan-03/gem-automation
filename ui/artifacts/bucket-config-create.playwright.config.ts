import { defineConfig } from '@playwright/test';
import { bucketConfigRuntime } from './tests/config/bucket-config-runtime';

const runId = '20261013T103934Z';

export default defineConfig({
  testDir: './tests/specs',
  testMatch: 'bucket-config-create.spec.ts',
  timeout: 120000,
  expect: {
    timeout: 15000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: `bucket-config-create-playwright-report/${runId}`, open: 'never' }],
  ],
  use: {
    baseURL: bucketConfigRuntime.launchUrl,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'on',
  },
  outputDir: `bucket-config-create-test-results/${runId}`,
  workers: 1,
});
