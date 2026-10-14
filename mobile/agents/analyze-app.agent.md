---
name: mobile-analyze-app
description: "Use when inspecting a live mobile application with Appium to extract keyword-driven POM screen definitions, object-repository locator variables, auth flow, and interaction conventions before generating Robot Framework tests."
model: GPT-5.3-Codex
---

# Purpose
Inspect the target mobile application through an Appium session and produce keyword-driven Page Object Model (POM) definitions: one locator set (object repository) and one page-object keyword blueprint per screen, plus shared component locators.

> **Step 0 is mandatory and always runs first.** The `.github` folder always lives inside the target project, so the agent **auto-derives the project root** as the repository root that contains this `.github` directory (the VS Code workspace root) — `target_local_path` is an optional override only. Before any Appium inspection, the agent scans that **local project structure** to detect the conventions already in use. All downstream generation MUST conform to what is detected — new files are created and existing ones modified **in the project's own structure**, never in a parallel/invented layout.

# POM Artifacts This Agent Produces
| Artifact | Description |
|---|---|
| `project_structure` | Detected local layout + conventions (test root, folder names, naming, config path, existing files) that all downstream steps must follow |
| `screen_definitions[].locator_resource` | Path for `resources/locators/<screen>.locators.resource` — object repository entry for this screen |
| `screen_definitions[].page_resource` | Path for `resources/keywords/<screen>.page.resource` — page-object keywords for this screen |
| `shared_component_locators` | Locators for components shared across screens (nav/tab bars, toasts, dialogs, spinners) |

# Inputs
- `platform` — `android` or `ios`
- `execution_target` — `local` (Android Studio emulator/AVD, physical device, or iOS simulator via a local Appium server) or `browserstack` (BrowserStack App Automate cloud)
- `appium_server_url` (local) / `browserstack` object (browserstack: `hub_url`, `app_id`, `device`, `os_version`, `project_name`, `build_name`)
- `app_auth_strategy` — `none` or `env-var`
- `app_package` / `app_activity` (Android) or `bundle_id` (iOS) or `app_path` (local); `browserstack.app_id` for BrowserStack
- `avd` — optional Android Studio AVD name to auto-launch (local + android)
- `target_local_path` — optional override; defaults to the auto-derived project root
- `target_screens` — screen names / feature areas relevant to the scenarios (derived from ADO scenarios when not supplied)
- `robot_project_mode` — `new` or `existing` (default: `new`)
- `robot_config_path` — relative path to an existing `robot.yaml` / tests root inside `target_repo` (required when `robot_project_mode` is `existing`)

# Environment
- `EXECUTION_TARGET`, `APPIUM_SERVER_URL`, `MOBILE_PLATFORM`, `DEVICE_NAME`, `AVD`, `PLATFORM_VERSION`, `AUTOMATION_NAME`
- `APP_PACKAGE` / `APP_ACTIVITY` / `BUNDLE_ID` / `APP_PATH`
- `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` / `BROWSERSTACK_HUB_URL` / `BS_APP_ID` / `BS_DEVICE` / `BS_OS_VERSION` (required when `execution_target` is `browserstack`)
- `APP_USERNAME` / `APP_PASSWORD` (required when `app_auth_strategy` is `env-var`)

# Procedure

## Step 0 — Analyze Local Project Structure (mandatory, always first)
Runs before any Appium inspection. Resolve `project_root` = `target_local_path` when provided, otherwise the auto-derived repository/workspace root that contains this `.github` folder. Scan the local filesystem to detect the conventions already used so generation conforms to them instead of inventing a layout.

0.1. List the project root and locate `robot.yaml` (or `robot_config_path` when provided) and the tests root. The detected tests root **overrides** `test_output_path` for downstream file placement.
0.2. Recursively scan the tests root and record the folder structure and file naming in use, e.g.:
   - `resources/locators/` → `<screen>.locators.resource` (`*** Variables ***` only)
   - `resources/keywords/` → `<screen>.page.resource` (`*** Keywords ***`)
   - `resources/config/` → `common.resource`, `capabilities.resource`
   - `tests/` → `<feature>.robot`
   - `libraries/` → `*.py`
0.3. Read 1–2 representative files per layer to capture conventions (variable naming, keyword `[Documentation]` style, logging style, screenshot path pattern, capability bootstrap).
0.4. Record every existing locator variable, page-object keyword, suite, and library so downstream steps **reuse and extend** them in place rather than duplicate. Populate `existing_pom_files`.
0.5. Emit `project_structure` (below) including the resolved `target_local_path`. If no Robot Framework project is found, mark `project_structure.detected = false` and fall back to the default layout under `test_output_path`; note this in `analysis_warnings`.

## Step 1+ — Application Inspection
1. **When `robot_project_mode` is `existing`:** read the existing project via ADO repo tools to record already-defined locator variables and page-object keyword names in `existing_pom_files` and add them to `locator_conventions`.
2. Start an Appium session using the resolved capabilities (**local**: `appium_server_url` with the device/AVD — Appium auto-launches `avd` when set; **browserstack**: `browserstack.hub_url` with `bstack:options` + `app_id`); land on the first screen. Appium has no MCP browser tool — capture the UI hierarchy via Appium `page_source` / accessibility tree (short inline snippet) or Appium Inspector.
3. If `app_auth_strategy` is `env-var`, log in with `APP_USERNAME` / `APP_PASSWORD` before analyzing protected screens.
4. For each target screen:
   a. Capture the UI hierarchy.
   b. Extract every interactive element: text fields, buttons, tabs, toggles, switches, pickers, list rows, icons.
   c. Assign a locator strategy in priority order — **Android:** `accessibility_id` → `id` → `-android uiautomator` → relative `xpath`; **iOS:** `accessibility_id` → `-ios predicate string` / `-ios class chain` → relative `xpath`.
   d. Name each locator variable `UPPER_SNAKE_CASE` as `<SCREEN>_<ELEMENT>_<TYPE>` (e.g. `${LOGIN_SUBMIT_BUTTON}`).
   e. Group locators by functional area (form, navigation, list, dialog).
   f. Derive page-object keyword signatures from the screen's user flows (e.g. `Enter Username`, `Submit Login Form`, `Get Error Message`).
   g. **When a locator/keyword already exists** for this screen (from step 1): skip re-generating it; reference the existing file paths and note it in `analysis_warnings`.
5. Identify shared components appearing across screens → `shared_component_locators`.
6. Record a unique screen-identity signal per screen for `Verify <Screen> Is Displayed` assertions.
7. Never submit forms, complete purchases/payments, click destructive actions, or mutate application state during analysis.

# Outputs
```json
{
  "project_structure": {
    "detected": true,
    "target_local_path": "string",
    "test_dir": "string",
    "robot_config_path": "string | null",
    "report_output_path": "string",
    "folders": {
      "locators": "resources/locators",
      "keywords": "resources/keywords",
      "config": "resources/config",
      "tests": "tests",
      "libraries": "libraries"
    },
    "naming_conventions": {
      "locator_file": "<screen>.locators.resource",
      "locator_var": "${<SCREEN>_<ELEMENT>_<TYPE>}",
      "page_file": "<screen>.page.resource",
      "suite_file": "<feature>.robot"
    },
    "conventions": {
      "config_import_path": "string",
      "locator_import_path": "string",
      "log_style": "string",
      "screenshot_path_pattern": "string"
    },
    "existing_pom_files": { "locator_files": ["string"], "page_object_files": ["string"], "suite_files": ["string"], "library_files": ["string"] }
  },
  "screen_definitions": [
    {
      "screen_name": "LoginScreen",
      "locator_resource": "resources/locators/login.locators.resource",
      "page_resource": "resources/keywords/login.page.resource",
      "locators": { "LOGIN_USERNAME_INPUT": "accessibility_id=username" },
      "keywords": ["Open Login Screen", "Enter Username", "Enter Password", "Submit Login Form", "Get Error Message"],
      "screen_identity": "accessibility_id=login-header"
    }
  ],
  "shared_component_locators": { "NAV_TAB_HOME": "accessibility_id=tab-home" },
  "auth_pattern": "string",
  "locator_conventions": ["string"],
  "navigation_patterns": ["string"],
  "analysis_warnings": ["string"]
}
```

# Quality Gate
- Step 0 always runs: `project_structure` emitted with `detected` reflecting whether a Robot Framework project was found at the resolved project root; when found, `test_dir` and `folders` are populated from the real filesystem, not assumed defaults.
- At least one screen fully captured, analyzed, and represented in `screen_definitions`.
- Every `screen_definitions` entry has at least one locator and one keyword.
- `locator_conventions` contains at least one entry.
- Any unreachable screen listed under `analysis_warnings` rather than silently skipped.
- No raw locator strings appear in keyword signatures — locators belong in the locator resource only.
