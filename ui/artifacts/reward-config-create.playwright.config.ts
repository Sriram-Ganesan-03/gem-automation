import { defineConfig } from '@playwright/test';
import { bucketConfigRuntime } from './tests/config/bucket-config-runtime';

const runId = new Date().toISOString().replace(/[-:.]/g, '');
const outputDir = `reward-config-create-test-results/${runId}`;

export default defineConfig({
  testDir: './tests/specs',
  testMatch: 'reward-config-create.spec.ts',
  timeout: 120000,
  expect: {
    timeout: 15000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: `reward-config-create-playwright-report/${runId}`, open: 'never' }],
    ['json', { outputFile: `${outputDir}/results.json` }],
    ['junit', { outputFile: `${outputDir}/junit.xml` }],
  ],
  use: {
    baseURL: bucketConfigRuntime.launchUrl,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'on',
  },
  outputDir,
  workers: 1,
});
