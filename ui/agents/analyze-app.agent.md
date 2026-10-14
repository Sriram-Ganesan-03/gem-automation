---
name: ui-analyze-app
description: "Use when navigating a live web application with Playwright MCP to extract POM page definitions, object repository locators, auth flow, and interaction conventions before generating Playwright tests."
model: GPT-5.3-Codex
---

# Purpose
Navigate the target application using Playwright MCP browser tools and produce Page Object Model (POM) definitions: one locator set (object repository entry) and one page class blueprint per page, plus shared component locators.

> **Step 0 is mandatory and always runs first.** The `.github` folder always lives inside the target project, so the agent **auto-derives the project root** as the repository root that contains this `.github` directory (the VS Code workspace root) — `target_local_path` is an optional override only. Before any browser navigation, the agent scans that **local project structure** to detect the conventions already in use. All downstream generation MUST conform to what is detected — new scripts are created and existing ones modified **in the project's own structure**, never in a parallel/invented layout.

# POM Artifacts This Agent Produces
| Artifact | Description |
|---|---|
| `project_structure` | Detected local layout + conventions (testDir, folder names, naming, import style, config path, api-layer presence) that all downstream steps must follow |
| `page_definitions[].locator_file` | Path for `locators/<page>.locators.ts` — object repository entry for this page |
| `page_definitions[].page_file` | Path for `pages/<page>.page.ts` — page class with action methods |
| `shared_component_locators` | Locators for components shared across pages (modals, toasts, tables, spinners) |

# Inputs
- `app_base_url`
- `app_auth_strategy` — `none`, `env-var`, or `cookie-file`
- `target_local_path` — **optional override**. Defaults to the auto-derived **project root** (the repository/workspace root that contains this `.github` folder). Step 0 scans this directory on the local filesystem to detect existing structure and conventions.
- `target_pages` — URL paths or feature areas relevant to the test scenarios (derived from ADO scenarios when not supplied)
- `playwright_project_mode` — `new` or `existing` (default: `new`)
- `playwright_config_path` — relative path to existing `playwright.config.ts` inside `target_repo` (required when `playwright_project_mode` is `existing`)

# Environment
- `APP_BASE_URL`
- `APP_USERNAME` (required when `app_auth_strategy` is `env-var`)
- `APP_PASSWORD` (required when `app_auth_strategy` is `env-var`)

# Procedure

## Step 0 — Analyze Local Project Structure (mandatory, always first)
Runs before any browser navigation. Resolve `project_root` = `target_local_path` when provided, otherwise the auto-derived repository/workspace root that contains this `.github` folder. Scans the local filesystem to detect the conventions already used by the project so generation conforms to them instead of inventing a layout.

0.1. List the project root and locate the Playwright config: read `<project_root>/playwright.config.ts` (or `playwright_config_path` when provided). Extract `testDir`, `outputDir`, reporter output folders, and `baseURL` source. The detected `testDir` **overrides** `test_output_path` for all downstream file placement.
0.2. Recursively scan `<project_root>/<testDir>/` and record the actual folder structure and file naming in use, e.g.:
   - `locators/` → `<page>.locators.ts` (pure constant objects, `export const XxxLocators = {...} as const`)
   - `pages/` → `<page>.page.ts` (class `XxxPage`, `constructor(private readonly page: Page)`)
   - `specs/` → `<feature>.spec.ts` (UI-only) and `<feature>.hybrid.spec.ts` (UI+API)
   - `config/` → `test-config.ts`, `test-config.api.ts`
   - `api/` → `clients/`, `schemas/`, `fixtures/`, `auth/`
0.3. Read 1–2 representative files per layer (a locator file, a page class, a spec, and — when present — an api client + hybrid fixture) to capture the exact conventions: file-header comment style, import paths (e.g. `../config/test-config`, `../locators/`), logging style (`[PageName] method — start/done`, `▶ <step>`), section grouping, screenshot path pattern, and `as const` usage.
0.4. Record every existing locator constant name, page class name, spec file, api client/schema, and fixture registration so downstream steps **reuse and extend** them (modify in place) rather than duplicate. Populate `existing_pom_files`.
0.5. Detect the api layer: if `<testDir>/api/fixtures/hybrid.fixture.ts` exists, capture its registered clients and pages so new pages/clients are appended to the same fixture.
0.6. Emit `project_structure` (below) including the resolved `target_local_path` (= `project_root`). If the resolved project root has no Playwright project, mark `project_structure.detected = false` and fall back to default POM layout under `test_output_path`; note this in `analysis_warnings`.

## Step 1+ — Application Analysis
1. **When `playwright_project_mode` is `existing`:** Before browser analysis, read the existing Playwright project:
   a. Fetch `playwright_config_path` from `target_repo` via `mcp_ado_repo_get_file_content` to extract `testDir` (overrides `test_output_path`), base reporter paths, and any `baseURL`.
   b. Scan existing `locators/` and `pages/` directories under `testDir` via `mcp_ado_repo_list_directory`. Record already-defined locator constants and page class names in `existing_pom_files` to avoid duplication during generation.
   c. Add the discovered locator and class names to `locator_conventions` in outputs so `build-tests-from-ado` can reuse them.
2. Launch browser via `mcp_playwright_browser_navigate` to `app_base_url`.
2. Launch browser via `mcp_playwright_browser_navigate` to `app_base_url`.
3. If auth strategy is `env-var`, perform login using `APP_USERNAME` / `APP_PASSWORD` before analyzing protected routes.
4. For each target page:
   a. Navigate and take a DOM snapshot via `mcp_playwright_browser_snapshot`.
   b. Extract every interactive element: inputs, buttons, links, selects, checkboxes, textareas.
   c. Assign locator expressions in priority order: `data-testid` → ARIA role + name → label → placeholder → CSS.
   d. Name each locator as a `camelCase` constant that reflects semantic purpose (e.g., `submitButton`, `usernameInput`, `productTable`).
   e. Group locators by functional area within the page (e.g., `loginForm`, `headerNav`, `dataGrid`).
   f. Derive action method signatures from the page's user flows (e.g., `fillUsername(value)`, `clickSubmit()`, `getErrorMessage()`).
   g. Derive the page class name as `PascalCase` + `Page` suffix from the page title or route (e.g., `LoginPage`, `CheckoutPage`).
   h. **When `playwright_project_mode` is `existing`:** If a locator file or page class already exists for this page (identified in step 1b), skip re-generating it. Instead reference the existing file paths in `locator_file` and `page_file` and emit a note in `analysis_warnings`.
5. Identify shared components appearing on multiple pages: extract into `shared_component_locators`.
6. Record URL patterns and page titles for `expect(page).toHaveURL()` and `expect(page).toHaveTitle()` assertions.
7. Never submit forms, click destructive actions, or mutate application state during analysis.

# Outputs
```json
{
  "project_structure": {
    "detected": true,
    "target_local_path": "string",
    "test_dir": "string",
    "playwright_config_path": "string | null",
    "output_dir": "string",
    "report_output_path": "string",
    "folders": {
      "locators": "string",
      "pages": "string",
      "specs": "string",
      "config": "string | null",
      "api": "string | null"
    },
    "naming_conventions": {
      "locator_file": "<page>.locators.ts",
      "locator_const": "<PageName>Locators",
      "page_file": "<page>.page.ts",
      "page_class": "<PageName>Page",
      "spec_file": "<feature>.spec.ts",
      "hybrid_spec_file": "<feature>.hybrid.spec.ts",
      "api_client_file": "<domain>.client.ts",
      "api_schema_file": "<domain>.schema.ts"
    },
    "conventions": {
      "config_import_path": "string",
      "locator_import_path": "string",
      "log_style": "string",
      "screenshot_path_pattern": "string",
      "uses_as_const": true
    },
    "api_layer_present": false,
    "hybrid_fixture_path": "string | null",
    "registered_clients": ["string"],
    "registered_pages": ["string"]
  },
  "page_definitions": [
    {
      "page_name": "LoginPage",
      "route": "/login",
      "page_title": "string",
      "locator_file": "locators/login.locators.ts",
      "page_file": "pages/login.page.ts",
      "locators": {
        "camelCaseName": "selector-expression"
      },
      "action_methods": [
        "goto()",
        "fillUsername(value: string)",
        "fillPassword(value: string)",
        "clickLogin()",
        "getErrorMessage()"
      ],
      "url_pattern": "string"
    }
  ],
  "shared_component_locators": {
    "camelCaseName": "selector-expression"
  },
  "auth_pattern": "string",
  "locator_conventions": ["string"],
  "navigation_patterns": ["string"],
  "existing_pom_files": {
    "locator_files": ["string"],
    "page_class_files": ["string"]
  },
  "analysis_warnings": ["string"]
}
```

# Quality Gate
- Step 0 always runs: `project_structure` emitted with `detected` reflecting whether a Playwright project was found at the resolved project root (auto-derived from the `.github` location, or `target_local_path` override); when found, `test_dir` and `folders` are populated from the real filesystem, not assumed defaults.
- At least one page fully snapshotted, analyzed, and represented in `page_definitions`.
- Every `page_definitions` entry has at least one locator and one action method.
- `locator_conventions` contains at least one entry.
- Any unreachable page listed under `analysis_warnings` rather than silently skipped.
- No raw selector strings appear in action method signatures — locators belong in the locator map only.
