---
name: api-spec-analysis
description: "Use when parsing an OpenAPI/Swagger document, a Postman collection, a manual endpoint list, or one or more raw curl commands into a normalized, domain-grouped endpoint catalog used by api-client-generator."
---

# Goal
Convert any supported API source into a single normalized catalog shape so downstream client/schema generation is source-agnostic.

> **Domain-agnostic.** This skill is bound to **no** application, vendor, or business domain. Every domain name, path, parameter, schema, header, and auth scheme is derived **only** from the supplied source (Postman collection/environment, OpenAPI/Swagger, a manual list, or raw curl commands). A gaming API, a banking API, and an IoT API all flow through the exact same normalization. Never carry over names, endpoints, or signing logic from a previous run or example; if the source lacks a fact, emit a warning instead of inventing one.

# Supported Sources
| `api_source` | Required input | Discovery method |
|---|---|---|
| `openapi` | `openapi_spec_path` (local file or URL, JSON or YAML, OpenAPI 3.x / Swagger 2.0) | Parse `paths.*` and `components.schemas.*` |
| `postman` | `postman_collection_path` (Postman v2.1 collection JSON) | Walk `item[]` tree; treat folders as domain hints |
| `manual` | `manual_endpoints` array | Pass through after validation |
| `curl` | `curl_commands` (inline) and/or `curl_source_file`; fallback `raw_input_file` | Tokenize each curl invocation into method/URL/headers/body |

# Optional Inputs
| Input | Applies to | Purpose |
|---|---|---|
| `postman_environment_path` | `postman` | Postman environment export (`{ "values": [{ "key", "value", "enabled" }] }`). Used to resolve `{{var}}` placeholders in the collection and to emit a `variable_map`. |
| `curl_commands` | `curl` | Inline array of raw curl command strings. Takes precedence over `curl_source_file` when non-empty. |
| `curl_source_file` | `curl` | Path to a text file (e.g. `input.txt`) holding one or more curl commands or a plain `METHOD URL` + header-lines definition. |
| `raw_input_file` | `curl` | Run-level input file used as the final fallback when neither `curl_commands` nor `curl_source_file` yields curl text. |

# Normalized Catalog Shape
```json
{
  "domains": [
    {
      "name": "tenant",
      "endpoints": [
        {
          "name": "createTenant",
          "method": "POST",
          "path": "/tenants",
          "path_params": ["string"],
          "query_params": [{ "name": "string", "required": false, "type": "string|number|boolean" }],
          "request_body_schema": "TenantCreateRequest | null",
          "response_schema_by_status": {
            "200": "Tenant",
            "201": "Tenant",
            "default": "ApiError"
          },
          "auth_required": true,
          "tags": ["string"],
          "summary": "string"
        }
      ]
    }
  ],
  "schemas": {
    "Tenant": { "$ref-resolved Zod-ready JSON shape" },
    "TenantCreateRequest": { "..." },
    "ApiError": { "..." }
  },
  "variable_map": [
    { "postman_var": "baseUrl", "kind": "literal", "value_or_env": "https://api.example.com", "secret": false },
    { "postman_var": "authToken", "kind": "env", "value_or_env": "API_BEARER_TOKEN", "secret": true }
  ],
  "auth_profile": {
    "resolved_strategy": "none | bearer-env | basic-env | api-key-header | custom-signature | oauth-client-credentials | cookie-from-ui-login",
    "scope": "collection | request | mixed",
    "detected_from": "postman-auth-block | postman-prerequest-script | openapi-securityScheme | manual",
    "header_names": ["string"],
    "query_param_names": ["string"],
    "required_env_vars": ["string"],
    "signing": {
      "algorithm": "string | null",
      "source_script_summary": "string | null",
      "inputs": ["string"]
    }
  },
  "warnings": ["string"]
}
```

# Procedure

## Phase 1 — Load source
1. **openapi**: read `openapi_spec_path` (fetch if URL); detect YAML vs JSON; parse to object. Validate `openapi` or `swagger` field. Fail if absent.
2. **postman**: read `postman_collection_path`; validate `info.schema` contains `v2.1.0`. Fail otherwise.
3. **manual**: validate each entry has `name`, `method`, `path`; throw on first violation.
4. **curl**: resolve the raw text in precedence order — non-empty `curl_commands` (joined), then `curl_source_file`, then `raw_input_file`. Fail if none yields readable text. Then run **Phase 1c**.

### Phase 1c — Curl / raw API definition parsing (only when `api_source` is `curl`)
1. **Split into invocations.** Treat each `curl ` occurrence (at a line start or after a shell separator such as `;`, `&&`, or a blank line) as the start of a new command. Join backslash (`\`) line-continuations and stray newlines within a single invocation into one logical line. Ignore surrounding prose — non-curl lines that do not match the plain-definition form below are skipped (recorded as a warning only if zero commands are found overall).
2. **Tokenize each invocation** honoring single/double quotes. Extract:
   - **method** — from `-X`/`--request`; default to `GET`, or `POST` when a body flag is present.
   - **url** — the first non-flag argument or the value of `--url`. Split into base (`scheme://host[:port]`) and `path`; parse the query string into `query_params[]` (`required: false`).
   - **headers** — every `-H`/`--header "Name: Value"` into a name→value map.
   - **request body** — `-d`/`--data`/`--data-raw`/`--data-binary`/`--data-urlencode`/`--json`. When the body is valid JSON, infer a request schema shape from its keys/value types; otherwise record `z.string()` and warn.
   - **basic auth** — `-u`/`--user user:pass` → basic-env (map to `API_USERNAME`/`API_PASSWORD`).
3. **Plain-definition fallback (no `curl` keyword).** Accept lines shaped as `METHOD https://host/path` optionally followed by indented `Header-Name: value` lines and a trailing JSON body block (as in `API-LAYER.md` “Anatomy of a request”). Parse them with the same field extraction as tokenized curl.
4. **Base URL reconciliation.** When every invocation shares one origin, set it as the catalog base URL; when they differ, keep per-endpoint absolute paths and warn. The caller's `api_base_url` always wins for the emitted client base.
5. **Secret redaction.** Classify a header **secret** when its name (case-insensitive) matches `authorization|api-?key|token|secret|password|pwd|cookie|signature|x-.*-key` **or** its value looks like a bearer/JWT/long opaque token. Never emit the value — record only the derived env-var name in `variable_map`/`auth_profile` and leave the header templated for `requireEnv()`.

### Phase 1b — Postman environment resolution (only when `postman_environment_path` is supplied)
1. Read and parse the environment export; fail if it lacks a `values[]` array.
2. Build a variable table from `values[]` where `enabled !== false`, keyed by `key`.
3. Classify each variable as **secret** when its `key` (case-insensitive) matches `token|secret|key|password|apikey|pwd|auth|credential`, **or** when the export marks `type: "secret"`. Otherwise it is a **literal**.
4. Resolve `{{var}}` placeholders that appear in collection URLs (`request.url.raw`, host, path) and in the collection-level `variable[]` block:
   - literal → substitute the actual value inline into the normalized `path` / base URL.
   - secret → do **not** substitute the value; leave the endpoint path templated and record an env-var mapping instead.
5. Emit `variable_map[]`: for each referenced variable, `{ postman_var, kind: 'literal'|'env', value_or_env, secret }`. For secrets, `value_or_env` is the derived UPPER_SNAKE env-var name (e.g., `authToken` → `API_BEARER_TOKEN` when it maps to bearer auth, else `API_<VARNAME>`).
6. Warn for any `{{var}}` used in the collection but absent from the environment (left unresolved as an env-var placeholder `API_<VARNAME>`).

## Phase 2 — Domain grouping
- **openapi**: group endpoints by first tag in `operation.tags`. If untagged, group by first path segment (e.g., `/tenants/{id}` → `tenant`).
- **postman**: group by top-level folder name (singularized, camelCased).
- **manual**: use explicit `domain` field if present, else first path segment.
- **curl**: group by the first meaningful path segment of each URL (skipping version/site prefixes like `api`, `v1`, `v2`, numeric ids), singularized and camelCased. Endpoint `name` is derived from method + last meaningful path segment (e.g., `POST /tenants` → `createTenant`, `GET /players/{id}` → `getPlayerById`).
- If `domains` input is supplied, restrict output to those names; warn for unknown ones.

## Phase 3 — Endpoint normalization
For every endpoint emit:
- `name` — camelCase verb + resource (e.g., `createTenant`, `listUsers`, `getUserById`). Derive from `operationId` when present, otherwise from method + last meaningful path segment.
- `method` — uppercased.
- `path` — original template path with `{param}` placeholders preserved.
- `path_params` — extracted from `{}` placeholders.
- `query_params` — name, required flag, primitive type.
- `request_body_schema` — name of the schema referenced by `application/json` request body; `null` for GET/DELETE without body.
- `response_schema_by_status` — map of HTTP status → schema name. Always include a `default` fallback (use `ApiError` synthesizing one if the spec lacks an error schema).
- `auth_required` — `true` unless the operation explicitly declares `security: []`.

## Phase 4 — Schema extraction
- **openapi**: flatten `components.schemas` with `$ref` resolution (one pass, depth-limited at 8). Inline anonymous schemas under a deterministic name `<EndpointName>Body` / `<EndpointName>Response`.
- **postman**: derive request/response schemas from saved example responses; if none exist, emit `z.unknown()` placeholder and add a warning.
- **manual**: trust caller-supplied schemas verbatim.
- **curl**: infer the request schema from the parsed JSON body (key names + primitive value types → Zod shape); for arrays, infer the element shape from the first item. When the body is absent or non-JSON, emit `z.string()`/`z.unknown()` and warn. Response schemas are `z.unknown()` placeholders (curl carries no response contract) with a warning to tighten them post-generation.

## Phase 5 — Sanity gate
- Drop endpoints with empty `path` or unsupported method (anything outside GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS).
- Deduplicate by `(method, path)`; keep the first occurrence and warn on duplicates.
- Emit warning for any endpoint missing both a success and default response schema.

## Phase 6 — Auth detection (source-driven, never assumed)
Infer the auth scheme purely from the source and record it in `auth_profile`:
- **openapi**: read `components.securitySchemes` + `security`. Map `http`+`bearer` → `bearer-env`; `http`+`basic` → `basic-env`; `apiKey` (header/query) → `api-key-header` (record the exact name); `oauth2` client-credentials flow → `oauth-client-credentials`.
- **postman**: read the collection-level and request-level `auth` blocks. `bearer` → `bearer-env`; `basic` → `basic-env`; `apikey` → `api-key-header` (record `key`/`in`). If auth is implemented via a **pre-request script** (custom signing/HMAC/packet signature/SigV4/etc.), set `custom-signature`, summarize the algorithm and the variables it reads in `signing`, and list those as `required_env_vars`. Do **not** reproduce secret values — only names.
- **manual**: trust a caller-supplied `auth` hint if present, else `none`.
- **curl**: read the parsed headers. `Authorization: Bearer <token>` → `bearer-env` (`API_BEARER_TOKEN`); `Authorization: Basic ...` or `-u user:pass` → `basic-env`; a static key header/param (`x-api-key`, `apikey`, `token`, etc.) → `api-key-header` (record the exact header/param name). If signing-style headers appear to be computed (e.g. `X-Signature`, `X-Amz-*`, HMAC digests) set `custom-signature`, summarize what is observable in `signing`, and warn that the signer needs human review. Never emit token values — only env-var names.
- Set `scope` to `collection` when uniform, `request` when only some requests declare auth, `mixed` when they differ. When requests differ, record per-domain notes in `warnings`.
- Never hardcode a vendor scheme; if the script is too opaque to port safely, still set `custom-signature`, capture `source_script_summary`, and warn that the signer needs human review.

# Outputs
- `endpoint_catalog` — the normalized object above.
- `auth_profile` — source-derived auth scheme, header/param names, required env-var names, and (for custom signers) an algorithm summary. Never contains secret values.
- `variable_map[]` — Postman environment → literal/env-var mapping (empty array when no environment supplied).
- `warnings[]` — every recoverable issue (untagged endpoints, missing schemas, ref-cycle truncation, postman without examples, unresolved `{{var}}`, opaque/mixed auth).

# Quality Gate
- At least one domain with at least one endpoint, or the skill must abort with a clear error.
- Every endpoint has a `name`, `method`, `path`, and at least one entry in `response_schema_by_status`.
- No raw `$ref` strings appear in the output — all references resolved or replaced with placeholders.
