---
name: ui-testcase-orchestrator
description: "Use when converting ADO user story and test cases into Playwright UI automation tests via staged agents: app analysis, test generation, and ADO pull request creation."
model: GPT-5.3-Codex
---

# Purpose
Orchestrate end-to-end conversion of ADO-linked test cases into Playwright `.spec.ts` files committed on a feature branch, then open an ADO pull request with reviewer assignment.

> **Output-first mode**: When the target application is unreachable, the orchestrator produces spec file artifacts in `ui/artifacts/tests/` and emits an `upload-instructions.json` so the operator can commit files manually. No step is silently skipped — missing outputs are flagged as explicit blockers.

# Required Inputs
- `app_base_url`
- `app_auth_strategy` (`none`, `env-var`, `cookie-file`)
- `test_output_path`
- `input_source` (`ado` or `raw-file`; default: `ado`)
- `run_mode` (`dry-run` or `execute`)

# Optional Inputs
- `raw_input_file` — path to a local `.md`, `.txt`, or `.json` file; **required when `input_source` is `raw-file`**; path is relative to workspace root
- `user_story_ado_link` — **required when `input_source` is `ado`**; ADO user story URL
- `test_cases_ado_link` — **required when `input_source` is `ado`**; ADO test suite URL
- `reviewer_ado_user_id` — **required when `run_mode` is `execute`**; ADO user email or GUID for the PR reviewer
- `target_repo` — **required when `run_mode` is `execute`**; ADO Git repo name
- `target_branch` — **required when `run_mode` is `execute`**; base branch (e.g. `main`); default: `main`
- `target_local_path` — **optional override**. The `.github` folder always lives inside the target project, so the **project root is auto-derived** as the repository root that contains this `.github` directory (equivalently, the VS Code workspace root). Downstream agents write all generated files there by default. Set `target_local_path` only to point at a different directory than the auto-derived root. When omitted or `null`, agents use the auto-derived project root — `create-ado-pr.agent.md` writes locators/pages/specs under `<project_root>/<test_output_path>` (or the detected `testDir`) and `playwright.config.ts` at its root; `ui/artifacts/` keeps a mirror copy only. Runs in both `dry-run` and `execute` modes, independent of ADO.
- `execution_confirmation` — **required when `run_mode` is `execute`**; must be `"APPROVED_EXECUTE"`
- `spec_name_override`
- `target_pages` — restrict analysis to specific URL paths
- `report_output_path` — HTML report folder (default: `playwright-report`); ignored when `playwright_project_mode` is `existing`
- `playwright_project_mode` — `new` (default) or `existing`; set to `existing` when the target repo already has a Playwright project
- `playwright_config_path` — relative path to `playwright.config.ts` inside `target_repo` (e.g., `"playwright.config.ts"`); required when `playwright_project_mode` is `existing`; agents read this file to derive `testDir` and reporter output paths
- `api_layer` — optional object enabling hybrid API + UI generation; omit or set to `null` to skip the API stage entirely. When present, the orchestrator invokes `build-api-layer.agent.md` after `build-tests-from-ado.agent.md` and before `create-ado-pr.agent.md`. Fields:
  - `enabled` (boolean, default `false`) — master switch; when `false`, the entire `api_layer` object is ignored
  - `api_source` (`openapi` | `postman` | `manual` | `curl`) — required when `enabled` is `true`
  - `api_base_url` (string) — required when `enabled` is `true`
  - `api_auth_strategy` (`auto` | `none` | `bearer-env` | `basic-env` | `api-key-header` | `custom-signature` | `cookie-from-ui-login` | `oauth-client-credentials`) — default `auto` (derive the scheme from the source)
  - `openapi_spec_path` — required when `api_source` is `openapi`
  - `postman_collection_path` — required when `api_source` is `postman`
  - `postman_environment_path` — optional; only used when `api_source` is `postman`. Resolves `{{var}}` placeholders and seeds config (secrets mapped to env-var names only)
  - `manual_endpoints` — required when `api_source` is `manual`
  - `curl_commands` — inline array of raw curl command strings; used when `api_source` is `curl` (takes precedence over `curl_source_file`)
  - `curl_source_file` — path to a file (e.g. `input.txt`) holding curl commands or a plain `METHOD URL` + headers definition; used when `api_source` is `curl`. Falls back to the run-level `raw_input_file` when both curl inputs are empty. Secret-looking headers are mapped to env-var names only
  - `domains` — optional array restricting client generation to these domain names
  - `schema_validation` (`strict` | `warn` | `off`) — default `warn`
  - `emit_hybrid_spec_stubs` (boolean) — default `false`
- `self_healing` — optional object enabling locator self-healing; omit or set `enabled` to `false` to skip. **Report-driven by default**: you run Playwright yourself with the JSON reporter and the heal agent consumes that report, repairs only `locators/` files, and returns a re-run command — it does not execute tests unless `heal_mode` is `agent-run`. In orchestration, when `heal_mode` is `agent-run`, the heal stage runs after test generation (and after `build-api-layer.agent.md` when present) and before `create-ado-pr.agent.md`. Fields:
  - `enabled` (boolean, default `false`) — master switch
  - `heal_task` (`heal-failures` | `validate-version` | `audit`, default `heal-failures`) — `heal-failures` repairs broken locators from a run; `validate-version` verifies locators against an upgraded app version and preserves per-version selectors (old selector for old version, new selector for new version); `audit` is a read-only health check of all locators that writes nothing
  - `app_version` / `previous_app_version` (string) — required when `heal_task` is `validate-version`
  - `heal_mode` (`report-driven` | `agent-run`, default `report-driven`) — `report-driven` consumes an existing Playwright JSON report; `agent-run` lets the agent execute the suite
  - `results_report_path` (string, default `test-results/results.json`) — Playwright JSON report path for report-driven mode
  - `max_attempts_per_locator` (integer, default `3`) — re-inspection attempts per broken locator before flagging for manual review
  - `max_total_reruns` (integer, default `5`) — cap on suite re-executions (agent-run mode only)
  - `heal_shared_locators` (boolean, default `true`) — allow healing `shared-components.locators.ts`
  - `strategy` (`semantic-first` | `testid-first`, default `semantic-first`) — locator derivation priority
- `allow_ado_mutation` (must stay `false`)
- `allow_probe_resources` (must stay `false`)
- `ado_access_mode` (must stay `read-only`)
- `ado_tool_calls_mode` (must stay `read-wrapper-only`)
- `ado_write_tools_disabled` (must stay `true`)

# Runtime Environment Variables
- `APP_BASE_URL`
- `APP_USERNAME`
- `APP_PASSWORD`
- `ADO_PAT`
- `ADO_ORG`
- `ADO_PROJECT`
- `API_BASE_URL` — required when `api_layer.enabled` is `true`
- `API_BEARER_TOKEN` — required when `api_layer.api_auth_strategy` is `bearer-env`
- `API_USERNAME` / `API_PASSWORD` — required when `api_layer.api_auth_strategy` is `basic-env`
- `API_OAUTH_CLIENT_ID` / `API_OAUTH_CLIENT_SECRET` / `API_OAUTH_TOKEN_URL` — required when `api_layer.api_auth_strategy` is `oauth-client-credentials`

# Agent Sequence
1. `analyze-app.agent.md` — **Step 0 (always first): analyze the local project structure** at the auto-derived project root (the repository/workspace root containing `.github`; overridable via `target_local_path`) to detect existing conventions (testDir, `locators/`/`pages/`/`specs/` layout, file naming, import style, config path, api-layer presence). All downstream generation conforms to the detected `project_structure`. Then navigate the app with Playwright MCP and emit POM page definitions (locator maps + action method signatures) and shared component locators.
2. `build-tests-from-ado.agent.md` — Phase 1 behaviour depends on `input_source`:
   - `ado`: fetch user story and test cases from ADO (read-only)
   - `raw-file`: read `raw_input_file` from disk; parse using `raw-input-parser` skill (no ADO calls in Phase 1)
   - Phases 2–5 (POM generation) are identical for both modes
3. **(Optional) `build-api-layer.agent.md`** — runs **only when `api_layer.enabled` is `true`**. Generates `tests/api/` (clients, schemas, hybrid fixture, optional auth bootstrap) alongside the POM without modifying `locators/` or `pages/`. Inputs are passed through from the `api_layer` object plus the `analysis` and `build` outputs from steps 1–2. When `emit_hybrid_spec_stubs` is `true`, also writes `<story>.hybrid.spec.ts` siblings next to the UI specs from step 2. **Precondition**: `ui/scripts/preflight-guardrails.ps1` must have run first — when `api_layer.enabled` is `true` it installs `zod`, `typescript`, and `@types/node` into the Playwright project root so this stage's output compiles.
4. **(Optional) `heal-tests.agent.md`** — runs **only when `self_healing.enabled` is `true`**. **Report-driven by default** (`heal_mode: report-driven`): consumes an existing Playwright JSON report from your manual/CI run, isolates locator-driven failures, self-heals broken selectors by re-inspecting the live accessibility tree via Playwright MCP — modifying only `locators/` files (never `pages/` or `specs/`) — and returns a re-run command; it does not execute tests. When `heal_mode` is `agent-run`, the agent executes the suite itself as part of orchestration. Skipped without aborting when the app is unreachable or Playwright MCP is unavailable. Emits a `heal` summary consumed by `create-ado-pr` for the PR description.
5. `create-ado-pr.agent.md` — create branch, commit all POM files (and, when present, all `tests/api/` files and hybrid spec stubs), open ADO PR with reviewer assignment; when `input_source` is `raw-file`, PR description references the source file name instead of an ADO story URL, and work-item linking is skipped

# Guard Rails
- **Deterministic checks are scripted, not reasoned.** Use `ui/scripts/parse-ado-refs.ps1` for ADO URL/ID extraction and `ui/scripts/lint-playwright-pom.ps1` for the no-raw-selectors / POM-structure gate; config + env are validated by `ui/scripts/preflight-guardrails.ps1`. Reserve the LLM for semantic work (app analysis, locator inference, scenario/step generation).
- Default to `dry-run`; never perform mutations in dry-run.
- Permit execute mode only when `execution_confirmation` equals `APPROVED_EXECUTE`.
- Never create or update ADO work items, comments, or relations (except the PR link created in the create-ado-pr step).
- Never submit forms or click destructive actions during app analysis.
- Never create probe or test resources (`_probe-*`).
- Abort if ADO access mode is not `read-only`.
- Abort if ADO write tools disabled flag is not `true`.
- Abort if `allow_ado_mutation` is not `false`.
- Abort if `allow_probe_resources` is not `false`.

# Pre-Call ADO Gate
- Before any ADO operation, run `ui/scripts/assert-ado-operation.ps1 -Operation <operation_name>`.
- Only operations in `ui/config/ado-operation-guardrails.json` `allowedReadOperations` may execute (plus PR/branch creation in execute mode).
- Any operation in `blockedWriteOperations` must be blocked before endpoint invocation.
- Fail-closed for unknown ADO operations.

# Orchestration Contract

## Input State
```json
{
  "app_base_url": "string",
  "app_auth_strategy": "none | env-var | cookie-file",
  "test_output_path": "string",
  "input_source": "ado | raw-file",
  "raw_input_file": "string | null",
  "user_story_ado_link": "string | null",
  "test_cases_ado_link": "string | null",
  "reviewer_ado_user_id": "string",
  "target_repo": "string",
  "target_branch": "string",
  "spec_name_override": "string | null",
  "target_pages": ["string"],
  "run_mode": "dry-run | execute",
  "execution_confirmation": "APPROVED_EXECUTE | null",
  "allow_ado_mutation": false,
  "allow_probe_resources": false,
  "ado_access_mode": "read-only",
  "ado_tool_calls_mode": "read-wrapper-only",
  "ado_write_tools_disabled": true,
  "api_layer": {
    "enabled": false,
    "api_source": "openapi | postman | manual | curl | null",
    "api_base_url": "string | null",
    "api_auth_strategy": "auto | none | bearer-env | basic-env | api-key-header | custom-signature | cookie-from-ui-login | oauth-client-credentials",
    "openapi_spec_path": "string | null",
    "postman_collection_path": "string | null",
    "postman_environment_path": "string | null",
    "curl_source_file": "string | null",
    "curl_commands": [],
    "manual_endpoints": [],
    "domains": ["string"],
    "schema_validation": "strict | warn | off",
    "emit_hybrid_spec_stubs": false
  },
  "self_healing": {
    "enabled": false,
    "heal_task": "heal-failures | validate-version | audit",
    "app_version": "string | null",
    "previous_app_version": "string | null",
    "heal_mode": "report-driven | agent-run",
    "results_report_path": "test-results/results.json",
    "max_attempts_per_locator": 3,
    "max_total_reruns": 5,
    "heal_shared_locators": true,
    "strategy": "semantic-first | testid-first"
  }
}
```

## Output State
```json
{
  "analysis": {
    "project_structure": {
      "detected": false,
      "test_dir": "string",
      "folders": {},
      "naming_conventions": {},
      "conventions": {},
      "api_layer_present": false,
      "registered_clients": [],
      "registered_pages": []
    },
    "page_definitions": [],
    "shared_component_locators": {},
    "auth_pattern": "string",
    "locator_conventions": ["string"],
    "navigation_patterns": ["string"]
  },
  "build": {
    "story_title": "string",
    "locator_files": [],
    "page_class_files": [],
    "spec_files": [],
    "conversion_warnings": ["string"]
  },
  "api": {
    "enabled": false,
    "endpoint_catalog": [],
    "client_files": [],
    "schema_files": [],
    "fixture_file": "string | null",
    "auth_file": "string | null",
    "hybrid_spec_stubs": ["string"],
    "config_additions": ["string"],
    "warnings": ["string"]
  },
  "heal": {
    "enabled": false,
    "skipped_reason": "string | null",
    "baseline": { "passed": 0, "failed": 0, "locator_driven": 0, "non_healable": 0 },
    "healed": [],
    "unhealed": [],
    "non_healable_failures": [],
    "reruns": 0,
    "final": { "passed": 0, "failed": 0 }
  },
  "pr": {
    "branch_name": "string",
    "pull_request_id": "string",
    "pull_request_url": "string",
    "reviewer_ado_user_id": "string"
  }
}
```

## Artifact Outputs (written to `ui/artifacts/` regardless of live availability)

| File | Purpose |
|---|---|
| `ui/artifacts/tests/config/test-config.ts` | Runtime config layer — typed `TestConfig` interface + `config` const; all specs and page classes import from here |
| `ui/artifacts/tests/locators/<page>.locators.ts` | Object Repository — pure locator constants per page |
| `ui/artifacts/tests/locators/shared-components.locators.ts` | Shared component locators used across pages |
| `ui/artifacts/tests/pages/<page>.page.ts` | Page Object class — imports locators, exposes action methods |
| `ui/artifacts/tests/specs/<story-kebab>.spec.ts` | Spec file — uses page objects only, no raw selectors |
| `ui/artifacts/playwright.config.ts` | Playwright config — loads `.env` via dotenv, imports `baseURL` from `test-config.ts`, sets reporters and capture options |
| `ui/artifacts/.env` | Runtime secrets for local Playwright execution — generated by `preflight-guardrails.ps1`; must be gitignored |
| `ui/artifacts/pr-payload.json` | PR metadata for manual creation if ADO is unreachable |
| `ui/artifacts/upload-instructions.json` | Step-by-step manual instructions with file paths and ADO API calls |
| `ui/artifacts/run-state.json` | Runtime state with resolved IDs and artifact paths |
| `ui/artifacts/tests/api/clients/<domain>.client.ts` | (api_layer only) Typed API client per domain |
| `ui/artifacts/tests/api/schemas/<domain>.schema.ts` | (api_layer only) Zod schemas per domain |
| `ui/artifacts/tests/api/fixtures/hybrid.fixture.ts` | (api_layer only) Single fixture exposing `{ api, pages }` |
| `ui/artifacts/tests/api/auth/api-auth.ts` | (api_layer only) Auth bootstrap; omitted when `api_auth_strategy` is `none` |
| `ui/artifacts/api-endpoint-catalog.json` | (api_layer only) Normalized endpoint catalog for review/PR description |
| `ui/artifacts/postman-variable-map.json` | (api_layer + postman env only) Postman environment → config/env-var mapping; secrets redacted to env-var names |

# Upload Instructions (when ADO repo API is blocked)

When ADO is not reachable from this terminal, complete the workflow manually:

1. **Commit POM files**
   - Copy all files from `ui/artifacts/tests/` (including `config/`, `locators/`, `pages/`, `specs/` subdirectories) into `<target_repo>/<test_output_path>/` on the feature branch.
   - Copy `ui/artifacts/playwright.config.ts` to the **root** of the target repo on the feature branch. Skip if a `playwright.config.ts` already exists there.
   - **Do not commit `ui/artifacts/.env`** — this file contains secrets and must stay gitignored.
   - Branch name is recorded in `ui/artifacts/run-state.json`.

2. **Create pull request**
   - Use `ui/artifacts/pr-payload.json` as the body.
   - `POST https://dev.azure.com/{org}/{project}/_apis/git/repositories/{repo}/pullrequests?api-version=7.1`
   - Header: `Authorization: Basic <base64(:<ADO_PAT>)>`

3. **Assign reviewer**
   - `PUT https://dev.azure.com/{org}/{project}/_apis/git/repositories/{repo}/pullrequests/{id}/reviewers/{userId}?api-version=7.1`

4. **Verify**
   - Run `ui/scripts/apply-playwright-tests.ps1 -ArtifactsPath ui/artifacts/tests` once access is restored.

# Failure Policy
- Fail fast on missing required input or missing environment variables.
- Fail fast when ADO authentication is invalid.
- If the target application is unreachable, skip analysis and emit `analysis_warnings`; do not abort — continue with available page context.
- Stop workflow when any step fails to produce its required artifact; return structured diagnostics.
- Never continue to PR creation with zero generated spec files or zero generated page class files.
- When `api_layer.enabled` is `true` and the API stage fails, mark `api.enabled = true` with populated `warnings` and continue to PR — UI artifacts still ship. PR description must list the API failure under "Known Issues".
- When `self_healing.enabled` is `true` and the app is unreachable or Playwright MCP is unavailable, set `heal.skipped_reason` and continue to PR without failing. Healing modifies only `locators/` files; it must never edit page classes or specs, weaken assertions, or perform ADO operations. Remaining locator-driven failures after retry caps are listed under `heal.unhealed` for the PR "Known Issues" section.
- Immediately stop if a non-whitelisted mutation is attempted.
- Immediately stop if `run_mode` is `execute` without explicit confirmation.
- Immediately stop if any blocked ADO write operation is attempted.

# Completion Criteria
- Local project structure analyzed first (Step 0): `analysis.project_structure` populated from the auto-derived project root (or `target_local_path` override), and all generated/modified files placed under the detected `test_dir` using the detected folder names, naming conventions, and code style. Existing files extended in place, not duplicated.
- All POM files produced in `ui/artifacts/tests/` (`locators/`, `pages/`, `specs/` subdirectories).
- `ui/artifacts/playwright.config.ts` generated with correct `testDir`, `report_output_path`, reporters, and env-driven `baseURL`. Skipped (with warning) if file already exists in target repo.
- `ui/artifacts/upload-instructions.json` written with file paths and ADO endpoints.
- When `self_healing.enabled` is `true`: suite executed, locator-driven failures healed against the live accessibility tree (each healed locator verified 1-of-1 and annotated with a `// HEALED` comment), only `locators/` files modified, and `heal` summary populated for the PR description. Skipped without aborting when the app is unreachable.
- `ui/artifacts/run-state.json` records all resolved IDs.
- If live ADO is reachable: branch created, spec files and `playwright.config.ts` committed, PR opened, reviewer assigned.
- If blocked: all artifacts present and `upload-instructions.json` is operator-ready.
- Final report includes spec file paths, test count, report locations (`playwright-report/index.html`, `test-results/results.json`, `test-results/junit.xml`), PR URL, and any conversion warnings.
