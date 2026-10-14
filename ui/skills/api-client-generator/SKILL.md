---
name: api-client-generator
description: "Use when converting a normalized endpoint catalog (from api-spec-analysis) into typed Playwright API client classes plus Zod schema modules. Generates one client + one schema file per domain; never touches POM files."
---

# Goal
Emit two deterministic, fully-typed TypeScript files per API domain:

> **Domain-agnostic.** Generation is bound to **no** application or business domain. Class names, method names, paths, payload/response types, header names, and the auth wrapper are all derived from the `endpoint_catalog` + `auth_profile` produced by `api-spec-analysis`. The same skill produces a gaming client, a payments client, or a logistics client without change. Never hardcode names, endpoints, headers, or signing logic from a prior run.

| File | Responsibility |
|---|---|
| `api/schemas/<domain>.schema.ts` | Zod schemas — one per request body and one per response shape; no runtime logic |
| `api/clients/<domain>.client.ts` | Client class wrapping Playwright `APIRequestContext`; one method per endpoint; validates responses against the schema module |

Plus, once per run:

| File | Responsibility |
|---|---|
| `api/auth/api-auth.ts` | Optional — auth bootstrap (token fetch, `storageState` producer); generated only when `api_auth_strategy ≠ none` |

# Inputs
- `endpoint_catalog` — from `api-spec-analysis`
- `api_base_url`
- `api_auth_strategy` — `auto` | `none` | `bearer-env` | `basic-env` | `api-key-header` | `custom-signature` | `cookie-from-ui-login` | `oauth-client-credentials`. When `auto`, use `auth_profile.resolved_strategy`.
- `auth_profile` — optional; from `api-spec-analysis`. Source-derived scheme, header/param names, required env vars, and (for custom signers) an algorithm summary. Drives Phase 3 generation.
- `schema_validation` — `strict` | `warn` | `off`
- `test_output_path`
- `variable_map` — optional; from `api-spec-analysis` when a Postman environment was supplied. Each entry: `{ postman_var, kind: 'literal'|'env', value_or_env, secret }`.

# Prerequisites
- `config/test-config.ts` exists (created by `playwright-test-generator`); this skill appends `apiBaseUrl` and any auth fields, never duplicates the file.
- Project has `zod` available (the generated file lists it as a required dev dependency in `warnings` if missing from `package.json`).

# Generation Rules

## Phase 1 — Schemas — `api/schemas/<domain>.schema.ts`

- Pure Zod definitions. No HTTP calls. No imports from `clients/` or `pages/`.
- One named export per schema in the catalog, suffixed with `Schema` for the Zod object and a `type` alias for the inferred TS type.
- Request schemas use the original schema name; response schemas use `<EndpointName>Response` when anonymous.

Example:
```typescript
// api/schemas/tenant.schema.ts
import { z } from 'zod';

export const TenantSchema = z.object({
  id:        z.string().uuid(),
  name:      z.string().min(1),
  createdAt: z.string().datetime(),
});
export type Tenant = z.infer<typeof TenantSchema>;

export const TenantCreateRequestSchema = z.object({
  name: z.string().min(1),
});
export type TenantCreateRequest = z.infer<typeof TenantCreateRequestSchema>;

export const ApiErrorSchema = z.object({
  code:    z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
```

## Phase 2 — Clients — `api/clients/<domain>.client.ts`

- One `export class <Domain>ApiClient` (PascalCase + `ApiClient`).
- Constructor signature: `constructor(private readonly request: APIRequestContext, private readonly baseUrl: string)`.
- One public async method per endpoint. Method name comes directly from `endpoint.name`.
- Method signature rules:
  - Path params → individual leading positional parameters, all typed `string`.
  - Query params → single `options?: { ... }` trailing parameter.
  - Request body → typed parameter using the imported request schema's inferred type.
  - Return type → the success response inferred type, or `void` for `204 No Content`.
- All HTTP calls go through `this.request` (Playwright `APIRequestContext`), never `fetch`.
- After every call:
  1. Check `response.ok()`; on failure, parse the body against `ApiErrorSchema` and throw an `Error` with method, path, status, and parsed code/message.
  2. Validate the success body with the response schema:
     - `schema_validation: strict` → `.parse()` (throws on mismatch).
     - `schema_validation: warn` → `.safeParse()`; on failure `console.warn` with issue summary and return the raw body cast to the inferred type.
     - `schema_validation: off` → no validation; return `await response.json() as <Type>`.
- Every public method gets a JSDoc citing HTTP method, path, request schema, response schema, and any auth requirement.
- No `any`. No inline string concatenation for URLs beyond `${this.baseUrl}${path}` with templated params.

Example (`schema_validation: warn`):
```typescript
// api/clients/tenant.client.ts
import { APIRequestContext } from '@playwright/test';
import {
  TenantSchema, Tenant,
  TenantCreateRequestSchema, TenantCreateRequest,
  ApiErrorSchema,
} from '../schemas/tenant.schema';

export class TenantApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
  ) {}

  /**
   * POST /tenants — create a new tenant.
   * Request:  TenantCreateRequestSchema
   * Response: TenantSchema (201)
   * Auth:     required
   */
  async createTenant(payload: TenantCreateRequest): Promise<Tenant> {
    const validated = TenantCreateRequestSchema.parse(payload);
    const res = await this.request.post(`${this.baseUrl}/tenants`, { data: validated });

    if (!res.ok()) {
      const errBody = ApiErrorSchema.safeParse(await res.json().catch(() => ({})));
      const code    = errBody.success ? errBody.data.code    : 'UNKNOWN';
      const message = errBody.success ? errBody.data.message : res.statusText();
      throw new Error(`[TenantApiClient.createTenant] POST /tenants failed ${res.status()} ${code}: ${message}`);
    }

    const body   = await res.json();
    const parsed = TenantSchema.safeParse(body);
    if (!parsed.success) {
      console.warn('[TenantApiClient.createTenant] response schema mismatch:', parsed.error.issues);
      return body as Tenant;
    }
    return parsed.data;
  }

  /**
   * DELETE /tenants/{id} — remove a tenant.
   * Response: 204 No Content
   * Auth:     required
   */
  async deleteTenant(id: string): Promise<void> {
    const res = await this.request.delete(`${this.baseUrl}/tenants/${id}`);
    if (!res.ok()) {
      throw new Error(`[TenantApiClient.deleteTenant] DELETE /tenants/${id} failed ${res.status()}`);
    }
  }
}
```

## Phase 3 — Auth bootstrap — `api/auth/api-auth.ts`

Generated only when the resolved strategy ≠ `none`. Reproduce the scheme described by `auth_profile` — never assume a fixed one. Pattern by resolved strategy:

- `bearer-env` — read `API_BEARER_TOKEN` from `config`; export `attachBearer(request)` and `bearerHeaders()`.
- `basic-env` — base64 `API_USERNAME:API_PASSWORD`; export `basicHeaders()`.
- `api-key-header` — read `API_KEY` from `config`; export `apiKeyHeaders()` that sets the exact header name from `auth_profile.header_names` (or appends the query param from `auth_profile.query_param_names`). The name comes from the source, not a literal.
- `custom-signature` — port the source's signing algorithm (e.g. a Postman pre-request HMAC/packet/SigV4 script summarized in `auth_profile.signing`) into `createSignedRequestContext(ctx, opts)` that computes and injects the required headers per request. All signer inputs (`auth_profile.signing.inputs` / `required_env_vars`) are read via `config.requireEnv()`. If the algorithm is too opaque to port safely, emit a clearly-marked `TODO` stub with the captured `source_script_summary` and add a `warnings` entry for human review — do not guess the crypto.
- `cookie-from-ui-login` — drive UI login via Playwright, persist `storageState` to `api/auth/storageState.json`; export `globalSetup` function.
- `oauth-client-credentials` — POST to `API_OAUTH_TOKEN_URL` with client id/secret; cache token in memory with expiry; export `getToken()`.

All credentials read through `config.requireEnv()` — never inline literals, never carry a scheme over from a previous run.

## Phase 4 — Config additions
Append (do not rewrite) `config/test-config.ts` with the fields required by the chosen auth strategy. If a field already exists, leave it untouched and add a warning.

### Phase 4b — Postman variable mapping (only when `variable_map` is supplied)
Fold the `variable_map` from `api-spec-analysis` into config, keeping secrets out of source:
- `kind: 'literal'` → append the value as a plain field under an `apiVars` block in `config/test-config.ts` (e.g., `baseUrl: 'https://api.example.com'`). Non-secret literals may be inlined.
- `kind: 'env'` (always the case for `secret: true`) → append a `requireEnv('<VALUE_OR_ENV>')` (or `optionalEnv` when the endpoint's `auth_required` is false) field; never inline the value.
- Emit a `.env`/README note in `warnings[]` listing every env-var name introduced so the runner can populate them.
- Deduplicate against existing `config/test-config.ts` fields; if a name collides, keep the existing definition and warn.
- Never write a Postman secret value into any generated file — only its env-var name.

# Outputs
```json
{
  "schema_files":  [{ "file_path": "string", "domain": "string", "schema_count": 0 }],
  "client_files":  [{ "file_path": "string", "domain": "string", "method_count": 0 }],
  "auth_file":     "string | null",
  "config_additions": ["string"],
  "warnings":      ["string"]
}
```

# Quality Gate
- Every endpoint in the catalog is represented by exactly one method on its domain client.
- Every client method that returns a body imports its response type from the matching schema module.
- No client file contains `fetch(`, `axios`, or any literal credential value.
- No schema file imports from `clients/`, `fixtures/`, `pages/`, or `locators/`.
- No Postman environment secret value appears in any generated file — secrets are referenced only by env-var name.
- `package.json` is **not** modified by this skill; missing `zod` is reported via `warnings` only.
