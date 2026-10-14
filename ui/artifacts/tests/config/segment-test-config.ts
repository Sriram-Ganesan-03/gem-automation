export interface SegmentTestConfig {
  baseUrl: string;
  username: string;
  password: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[segment-test-config] Required environment variable not set: ${name}`);
  }
  return value;
}

export const segmentTestConfig: SegmentTestConfig = {
  baseUrl: requireEnv('APP_BASE_URL'),
  username: requireEnv('APP_USERNAME'),
  password: requireEnv('APP_PASSWORD'),
};
