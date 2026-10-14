import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inputPath = resolve(__dirname, '../../../input.txt');
const rawInput = readFileSync(inputPath, 'utf8');

function fromEnvironmentOrInput(name: string, pattern: RegExp): string {
  const environmentValue = process.env[name];
  if (environmentValue) return environmentValue;

  const inputValue = rawInput.match(pattern)?.[1]?.trim();
  if (!inputValue) {
    throw new Error(`${name} is required in the environment or local UI input.`);
  }
  return inputValue.replace(/^["']|["']$/g, '');
}

const launchUrl =
  process.env.APP_BASE_URL?.trim() ??
  rawInput.match(/^Launch URL:\s*(\S+)\s*$/im)?.[1];

if (!launchUrl) {
  throw new Error('APP_BASE_URL or a Launch URL in the local UI input is required.');
}

export const bucketConfigRuntime = {
  launchUrl,
  username: fromEnvironmentOrInput(
    'APP_USERNAME',
    /^\s*\d+\.\s*Enter username as\s+(.+?)\s*$/im,
  ).replace(/\.$/, ''),
  password: fromEnvironmentOrInput(
    'APP_PASSWORD',
    /^\s*\d+\.\s*Enter the configured password as\s+(.+?)\s*$/im,
  ),
  appVersion: process.env.APP_VERSION?.trim() || '0.0.0',
} as const;
