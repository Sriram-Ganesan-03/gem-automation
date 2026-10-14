function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`[test-config] Required environment variable not set: ${name}`);
  }
  return value;
}

export const config = {
  baseUrl: requireEnv('APP_BASE_URL'),
  username: requireEnv('APP_USERNAME'),
  password: requireEnv('APP_PASSWORD'),
  tenantSearchTerm: "ATM A01",
  tenantIdSuffix: "136",
  namePrefix: "TestTenant UAT",
  trilogyGoDomain: "trilogy-go-uat01.purplecheckpoint.com",
  trilogyDomain: "loyalty-atm-july27.purplecheckpoint.com",
  extraDomain: "loyalty-atm-july27-1.purplecheckpoint.com",
  description: "TestTenant UAT",
  siteName: "UAT_PKMS_SITE",
  trilogyBaseUrl: "https://loyalty-atm-a01.purplecheckpoint.com",
  IP: "1.2.10.200",
} as const;
