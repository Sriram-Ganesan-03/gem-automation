---
name: ui-build-api-layer
description: "Use when generating a typed API client layer (clients, schemas, hybrid fixtures) that runs alongside the Playwright POM to enable hybrid API + UI end-to-end validation. Produces files under tests/api/ without modifying existing POM files."
model: GPT-5.3-Codex
---

# Purpose
Generate a typed API layer that lives **next to** the Page Object Model and exposes both `api` and `pages` through a single Playwright fixture, so specs can:

- arrange test state via API (fast, deterministic)
- act through the UI (real user journey)
- assert backend side-effects via API
- tear down via API

Page Objects stay pure UI; this agent never edits files under `pages/` or `locators/`.

> **Conform to the detected project structure.** When `analysis.project_structure.detected` is `true`, place all files under its `test_dir` and `api` folder using the detected `naming_conventions` (`<domain>.client.ts`, `<domain>.schema.ts`) and code style. If a hybrid fixture already exists (`analysis.project_structure.hybrid_fixture_path`), **register new clients/pages into that existing fixture in place** — do not create a second fixture. The layout below is the fallback used only when no existing api layer is detected.

# Hybrid Layout Produced (under `test_output_path`)
```
<test_output_path>/
  api/
    clients/
      <domain>.client.ts          ← Typed HTTP client per domain/service
    schemas/
      <domain>.schema.ts          ← Zod schemas for response validation
    fixtures/
      hybrid.fixture.ts           ← Single fixture exposing { api, pages }
    auth/
      api-auth.ts                 ← Token bootstrap + storageState producer (optional)
  locators/                       ← UNCHANGED (pure UI POM)
  pages/                          ← UNCHANGED (pure UI POM)
  specs/
    <story-kebab>.hybrid.spec.ts  ← Hybrid specs only; existing UI-only specs untouched
```

# Required Inputs
- `api_source` — `openapi` | `postman` | `manual` | `curl`
- `api_base_url` — root URL for the API under test
- `api_auth_strategy` — `auto` | `none` | `bearer-env` | `basic-env` | `api-key-header` | `custom-signature` | `cookie-from-ui-login` | `oauth-client-credentials`. Default `auto`: derive the scheme from the source (Postman collection/request `auth` blocks and pre-request scripts, or OpenAPI `securitySchemes`) instead of assuming one. `custom-signature` covers app-specific signing (HMAC, SigV4, packet signatures, etc.) reproduced from the collection's pre-request script; `api-key-header` covers a static key/token sent in a header or query param.
- `test_output_path` — same root as the UI POM (e.g., `tests/e2e`)
- `run_mode` — `dry-run` | `execute`

> **Domain-agnostic guarantee.** This agent is **not** bound to any application, vendor, or business domain. All domain names, resource paths, request/response shapes, header names, base URLs, and auth schemes are **derived entirely from the supplied `api_source`** (a Postman collection/environment, an OpenAPI/Swagger doc, a manual endpoint list, or one or more raw curl commands). Give it a gaming API, a payments API, a healthcare API — the same pipeline digests the source and emits the corresponding typed client layer. Never hardcode names, endpoints, headers, or signing logic from any prior run; if a fact is not present in the provided source, treat it as unknown and surface a warning rather than inventing it.

# Optional Inputs
- `openapi_spec_path` — local path or URL to an OpenAPI/Swagger document; **required when `api_source` is `openapi`**
- `postman_collection_path` — local path to a Postman collection JSON; **required when `api_source` is `postman`**
- `postman_environment_path` — local path to a Postman environment JSON (v2 export); **optional, only meaningful when `api_source` is `postman`**. Its variables resolve `{{var}}` placeholders in the collection and seed generated config/env-var names. Secret-looking values (token, key, secret, password, apikey) are never written into generated files — only their variable name is mapped to an env var read via `config/test-config.ts` `requireEnv()`.
- `manual_endpoints` — array of `{ name, method, path, requestSchema?, responseSchema? }`; **required when `api_source` is `manual`**
- `curl_commands` — inline array of raw curl command strings (each may span multiple lines with `\` continuations); **used when `api_source` is `curl`**. Takes precedence over `curl_source_file` when non-empty.
- `curl_source_file` — path to a text file (e.g. the run `input.txt`) containing one or more curl commands, or a plain `METHOD URL` + header-lines API definition; **used when `api_source` is `curl`**. When `api_source` is `curl` and both `curl_commands` and `curl_source_file` are empty/null, the parser falls back to the run-level `raw_input_file` (`input.txt`).
- `domains` — explicit list of domain names to generate clients for (e.g., `["tenant", "user", "billing"]`); when omitted, domains are inferred from tag/folder grouping
- `schema_validation` — `strict` | `warn` | `off` (default: `warn`); controls whether response schema mismatches throw or log
- `analysis` — output from `ui-analyze-app`; provides `project_structure` (detected `test_dir`, api folders, naming conventions, existing `hybrid_fixture_path`, `registered_clients`, `registered_pages`) and shares `auth_pattern` when `api_auth_strategy` is `cookie-from-ui-login`
- `build` — output from `ui-build-tests-from-ado`; used to emit one hybrid spec stub per existing UI spec when requested
- `emit_hybrid_spec_stubs` — `true` | `false` (default: `false`); when `true`, generate `<story-kebab>.hybrid.spec.ts` skeletons that combine arrange-via-API + act-via-UI + assert-via-API
- `allow_api_mutation` (must stay `false` during analysis; only the generated tests perform mutations at runtime)
- `allow_probe_resources` (must stay `false`)

# Runtime Environment Variables
- `API_BASE_URL`
- `API_BEARER_TOKEN` — required when `api_auth_strategy` resolves to `bearer-env`
- `API_USERNAME` / `API_PASSWORD` — required when `api_auth_strategy` resolves to `basic-env`
- `API_KEY` / `API_KEY_HEADER_NAME` — required when `api_auth_strategy` resolves to `api-key-header` (header/param name defaults to the one found in the source)
- `API_OAUTH_CLIENT_ID` / `API_OAUTH_CLIENT_SECRET` / `API_OAUTH_TOKEN_URL` — required when `api_auth_strategy` resolves to `oauth-client-credentials`
- Custom-signature schemes read whatever named credentials the source's signing script references (e.g. `API_KEY`, `API_SECRET_KEY`, plus any signer-specific inputs); every such value is read via `requireEnv()` — never inlined.

# Guard Rails
- Default to `dry-run`; never call live mutating endpoints during analysis.
- Never write into `<test_output_path>/locators/` or `<test_output_path>/pages/`.
- Never read or write secrets inline — all credentials go through `config/test-config.ts` `requireEnv()`.
- Never embed bearer tokens, cookies, or basic-auth strings in generated files.
- Abort if `api_source` is `openapi` or `postman` and the source file cannot be read.
- Abort if `api_source` is `curl` and no curl command can be resolved from `curl_commands`, `curl_source_file`, or the fallback `raw_input_file`, or the resolved text contains zero parseable curl/API definitions.
- Never emit a secret-looking curl header value (Authorization, api-key, token, cookie, etc.) into any generated file — map it to an env-var name read via `requireEnv()`.
- Abort if `postman_environment_path` is supplied but the file cannot be read or is not a valid Postman environment export.
- Never emit a Postman environment secret value into any generated file — map secret-looking variables to env-var names only.
- Abort if `api_auth_strategy` is `oauth-client-credentials` and any OAuth env var is missing.
- Abort if `allow_api_mutation` is not `false`.

# Pre-Call Gate
- When `api_source` is `openapi` and the spec is hosted on ADO/Git, run `ui/scripts/assert-ado-operation.ps1 -Operation repo_get_file_content` before fetch.
- When `api_source` is `curl`, resolve the raw text locally (inline `curl_commands`, then `curl_source_file`, then `raw_input_file`); no network or ADO call is made during discovery.
- Only schema/discovery operations are permitted during dry-run.
- **Dependency precondition**: the orchestrator MUST run `ui/scripts/preflight-guardrails.ps1` before invoking this agent. When `api_layer.enabled` is `true`, preflight installs `zod` (runtime) and `typescript` + `@types/node` (dev) into the Playwright project root so the generated `tests/api/*` compiles. Abort if these packages are not resolvable from `test_output_path`.

# Agent Sequence
1. **API source analysis** — invoke `api-spec-analysis` skill to parse the OpenAPI / Postman / manual / curl definition into a normalized endpoint catalog grouped by domain. When `api_source` is `curl`, pass `curl_commands` / `curl_source_file` (falling back to `raw_input_file`) so the skill tokenizes each curl invocation into method, URL, headers, query params, and request body, groups endpoints by the first meaningful path segment, and maps secret-looking header values to env-var names. When `postman_environment_path` is supplied, pass it through so the skill resolves `{{var}}` placeholders and returns a `variable_map` (non-secret → literal, secret → env-var name). The skill also returns an `auth_profile` describing the scheme(s) it detected in the source (collection/request `auth` blocks, pre-request scripts, OpenAPI `securitySchemes`, or curl `Authorization`/api-key headers).
2. **Schema generation** — invoke `api-client-generator` skill, phase 1: emit one `schemas/<domain>.schema.ts` per domain with Zod schemas for every request body and response shape.
3. **Client generation** — invoke `api-client-generator` skill, phase 2: emit one `clients/<domain>.client.ts` per domain. Each method:
   - accepts a typed request payload
   - calls Playwright `APIRequestContext`
   - validates the response against the matching Zod schema (`strict` throws, `warn` logs)
   - returns the parsed, typed body
4. **Auth bootstrap** — when the resolved `api_auth_strategy` is not `none`, emit `api/auth/api-auth.ts`. The generated shape depends on the strategy resolved from `auth_profile`:
   - `bearer-env` / `basic-env` / `api-key-header` — export a header producer (`authHeaders()`) reading credentials via `requireEnv()`.
   - `oauth-client-credentials` — export `getToken()` with in-memory caching.
   - `cookie-from-ui-login` — export `loginViaApi()` returning `{ token, storageState }` plus a `globalSetup` wrapper that produces a reusable `storageState.json`.
   - `custom-signature` — port the source's signing algorithm (e.g. Postman pre-request script) into a `createSignedRequestContext()` wrapper that injects the computed headers per request; read all signer inputs via `requireEnv()`. Never bind to a specific vendor scheme — reproduce exactly what the source defines.
5. **Hybrid fixture** — invoke `hybrid-fixture-composer` skill: emit `fixtures/hybrid.fixture.ts` that extends `base` test with `api` (object containing one instance per client) and `pages` (object containing one instance per page class discovered under `pages/`). Re-exports `expect`.
6. **Hybrid spec stubs (optional)** — when `emit_hybrid_spec_stubs` is `true` and `build` is supplied: for each spec in `build.spec_files`, emit a sibling `<story-kebab>.hybrid.spec.ts` skeleton that imports from `hybrid.fixture` and contains one `test()` per scenario with `// ARRANGE (api)`, `// ACT (ui)`, `// ASSERT (ui)`, `// ASSERT (api)`, `// TEARDOWN (api)` regions left for the developer to fill.

# Orchestration Contract

## Input State
```json
{
  "api_source": "openapi | postman | manual | curl",
  "api_base_url": "string",
  "api_auth_strategy": "auto | none | bearer-env | basic-env | api-key-header | custom-signature | cookie-from-ui-login | oauth-client-credentials",
  "test_output_path": "string",
  "openapi_spec_path": "string | null",
  "postman_collection_path": "string | null",
  "postman_environment_path": "string | null",
  "curl_source_file": "string | null",
  "curl_commands": [],
  "manual_endpoints": [],
  "domains": ["string"],
  "schema_validation": "strict | warn | off",
  "emit_hybrid_spec_stubs": false,
  "run_mode": "dry-run | execute",
  "allow_api_mutation": false,
  "allow_probe_resources": false
}
```

## Output State
```json
{
  "api": {
    "endpoint_catalog": [
      { "domain": "string", "name": "string", "method": "GET|POST|PUT|PATCH|DELETE", "path": "string" }
    ],
    "client_files": [
      { "file_path": "string", "domain": "string", "method_count": 0 }
    ],
    "schema_files": [
      { "file_path": "string", "domain": "string", "schema_count": 0 }
    ],
    "fixture_file": "string",
    "auth_file": "string | null",
    "variable_map": [
      { "postman_var": "string", "kind": "literal | env", "value_or_env": "string", "secret": false }
    ],
    "hybrid_spec_stubs": ["string"],
    "config_additions": ["string"],
    "warnings": ["string"]
  }
}
```

## Artifact Outputs (written to `ui/artifacts/tests/api/`)

| File | Purpose |
|---|---|
| `ui/artifacts/tests/api/clients/<domain>.client.ts` | Typed client class for one API domain |
| `ui/artifacts/tests/api/schemas/<domain>.schema.ts` | Zod request/response schemas for that domain |
| `ui/artifacts/tests/api/fixtures/hybrid.fixture.ts` | Single Playwright fixture exposing `{ api, pages }` |
| `ui/artifacts/tests/api/auth/api-auth.ts` | API auth bootstrap + `storageState` producer (when auth strategy is not `none`) |
| `ui/artifacts/tests/specs/<story>.hybrid.spec.ts` | Optional hybrid spec stubs (only when `emit_hybrid_spec_stubs` is `true`) |
| `ui/artifacts/api-endpoint-catalog.json` | Normalized endpoint catalog for review/PR description |
| `ui/artifacts/postman-variable-map.json` | Postman environment → config/env-var mapping (only when `postman_environment_path` is supplied); secret values redacted to env-var names |

# Config Integration
The agent appends new fields to `config/test-config.ts` (generated by `playwright-test-generator`):

```typescript
export interface TestConfig {
  baseUrl:  string;
  username: string;
  password: string;
  apiBaseUrl: string;
  apiBearerToken?: string;
}
```

Corresponding `requireEnv()` / optional reads are added. Existing UI fields are never removed; additions are merged.

# Failure Policy
- Fail fast on missing required input or missing env vars for the chosen auth strategy.
- Fail fast when the OpenAPI/Postman source is unreadable or contains zero endpoints.
- If a domain produces zero usable endpoints, list it under `warnings` and continue with remaining domains; never silently drop.
- Never overwrite an existing client file without recording a warning and a unified diff in `warnings`.
- Stop workflow when fixture generation fails — without it the hybrid layer is unusable.

# Completion Criteria
- At least one `clients/<domain>.client.ts` and matching `schemas/<domain>.schema.ts` written.
- `fixtures/hybrid.fixture.ts` written and references every generated client by name.
- `api-endpoint-catalog.json` enumerates every discovered endpoint.
- POM files (`locators/`, `pages/`) untouched — verifiable by no entries appearing for them in the output diff.
- When `emit_hybrid_spec_stubs` is `true`: one `<story>.hybrid.spec.ts` per UI spec in `build.spec_files`.
- Final report lists client files, schema files, fixture path, auth file (or `null`), hybrid spec stubs, and any warnings.
