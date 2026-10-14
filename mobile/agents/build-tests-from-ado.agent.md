---
name: mobile-build-tests-from-ado
description: "Use when converting user story and test cases (from ADO links or a raw local file) into keyword-driven Robot Framework + Appium files: object-repository locator resources, page-object keyword resources, config resources, and .robot test suites that call page-object keywords only."
model: GPT-5.3-Codex
---

# Purpose
Fetch or parse test scenarios, combine with Appium app-analysis screen definitions, and generate a full four-layer Robot Framework test suite: Object Repository (locator resources), Page Objects (keyword resources), Config (session + shared variables), and Test Suites (`.robot`).

> **Conform to the detected project structure.** When `analysis.project_structure.detected` is `true`, place files under the detected test root using the detected folder names, file-naming conventions, import paths, and logging style — and extend existing files (locators, keyword resources, config) in place rather than create duplicates. The layout below is the fallback used only when no existing structure is detected.

# POM File Layout (under `test_output_path`)
```
<test_output_path>/
  resources/
    config/
      common.resource            ← session bootstrap + shared vars (generated first)
      capabilities.resource
    locators/
      <screen>.locators.resource ← Object Repository — *** Variables *** only
      shared-components.locators.resource
    keywords/
      <screen>.page.resource     ← Page Object — imports locators, exposes business keywords
  libraries/
    VersionLocators.py           ← version-scoped locator resolver
  tests/
    <story-kebab>[-<suffix>].robot ← Test suite — NEW file each run (never overwritten); calls page-object keywords only
robot.yaml                       ← repo root — run task (generated once in 'new' mode)
requirements.txt                 ← repo root
```

# Inputs
- `input_source` — `ado` (default) or `raw-file`; controls Phase 1 branch
- `user_story_ado_link` / `user_story_id` — required (one of) when `input_source` is `ado`
- `test_cases_ado_link` / (`test_plan_id` + `test_suite_id`) — required (one form) when `input_source` is `ado`
- `raw_input_file` — required when `input_source` is `raw-file`; `.md`, `.txt`, `.json`, or a Test Cases workflow `.xlsx`/`testcase-generator .json` (auto-converted via `testcase-excel-to-rawinput`)
- `analysis` — output from `mobile-analyze-app` (`project_structure`, `screen_definitions`, `shared_component_locators`, `auth_pattern`, `existing_pom_files`). When `analysis.project_structure.detected` is `true`, its `test_dir`, `folders`, `naming_conventions`, and `conventions` **override** the defaults and dictate exact file placement, naming, and style.
- `platform`, `test_output_path`, `report_output_path`
- `execution_target` — `local` or `browserstack`; passed through to the generated `common.resource` session bootstrap only (locators/keywords/suites are identical across targets)
- `screenshot_mode` — `all` | `on-failure` | `none` (default: `on-failure`)
- `log_level` — `step` | `action` | `none` (default: `step`)
- `robot_project_mode` — `new` or `existing` (default: `new`)
- `robot_config_path` — required when `robot_project_mode` is `existing`
- `spec_name_override` (optional)

# Environment
- `ADO_PAT`, `ADO_ORG`, `ADO_PROJECT`
- Appium capability env vars (consumed by the config layer only)

# Procedure

## Phase 1 — Resolve Test Scenarios
**Branch A — `input_source` is `ado`**
1. Resolve ADO identifiers **deterministically** by running `mobile/scripts/parse-ado-refs.ps1 -ConfigPath mobile/config/workflow-input.current.json`. Use the emitted ids directly.
2. Before each ADO call, run `mobile/scripts/assert-ado-operation.ps1 -Operation <tool_name>`.
3. Fetch the user story via `mcp_ado_wit_get_work_item`.
4. Fetch test cases via `mcp_ado_testplan_list_test_cases`.
5. Normalize scenarios into structured step/assertion pairs using the `ado-testcase-parser` skill.

**Branch B — `input_source` is `raw-file`**
1. Verify `raw_input_file` is set and non-empty; abort with a clear error if not.
2. **If `raw_input_file` ends in `.xlsx` or is a `testcase-generator` `.json`**, first convert it with `testcase-excel-to-rawinput` to a sibling `<basename>.rawinput.json`; use `spec_name_override` as `story_title_override`; carry over `conversion_warnings`.
3. Read the (possibly converted) file from disk.
4. Parse using the `raw-input-parser` skill — produces `story_title` and `test_scenarios[]` in the same shape as `ado-testcase-parser`.
5. Record source in build metadata (`input_source`, `raw_input_file`, optional `converted_from`) for the PR description.

## Phase 2 — Generate Config Layer (`resources/config/`)
> Resolve the base output directory first: use `analysis.project_structure.test_dir` and `folders` when `detected` is `true`; otherwise fall back to `test_output_path`.
5a. **Generate `resources/config/common.resource` first** (before any locator, keyword, or suite): session bootstrap that branches on `${EXECUTION_TARGET}` (`local` → `Open Local Android Session` / `Open Local iOS Session`; `browserstack` → `Open BrowserStack Session` against the hub with `bstack:options`), `Register Keyword To Run On Failure`, and shared variables read from env vars (`%{EXECUTION_TARGET=local}`, `%{APPIUM_SERVER_URL=...}`, `%{MOBILE_PLATFORM=...}`, `%{AVD=}`, `%{APP_VERSION=0.0.0}`, `%{APP_USERNAME=}`, `%{APP_PASSWORD=}`, the `%{BROWSERSTACK_*}` / `%{BS_*}` set, `${SCREENSHOT_DIR}`). Add the `Resolve Locator` wrapper keyword. Extend in place if it already exists.
5b. **Emit `libraries/VersionLocators.py`** (pure Python resolver) once; skip if it already exists.

## Phase 3 — Generate Object Repository (`resources/locators/`)
6. For each screen in `analysis.screen_definitions`, emit `resources/locators/<screen>.locators.resource`:
   - A single `*** Variables ***` section; one `UPPER_SNAKE_CASE` locator variable per element.
   - Explicit-strategy Appium locators; no AppiumLibrary import, no keywords.
   - If a target file already exists (in `analysis.existing_pom_files`), **modify it in place** — add new variables without removing existing ones.
7. Emit `resources/locators/shared-components.locators.resource` from `analysis.shared_component_locators`.

## Phase 4 — Generate Page Objects (`resources/keywords/`)
8. For each screen, emit `resources/keywords/<screen>.page.resource`:
   - `Resource` the corresponding locator resource and `common.resource`; `Library AppiumLibrary`.
   - Implement every keyword listed in `screen_definitions.keywords` as a Title Case business action.
   - Every interaction references a locator variable; always `Wait Until Element Is Visible` before interacting.
   - `[Documentation]` on each keyword citing the locator variable and ADO scenario context.
   - **When `log_level` is `action`:** bracket each keyword body with `Log    [<Screen>] <Keyword> — start` / `— done`.

## Phase 5 — Generate Test Suites (`tests/`)
9. Derive the base suite file name from `story_title` in kebab-case (or `spec_name_override` when supplied). **Always write the `.robot` suite as a NEW file each run — never overwrite or modify an existing suite in place.** If a `.robot` file with the derived name already exists in the resolved `tests/` directory (check both the artifacts output and the target `tests/` dir), append a unique kebab-safe suffix so a fresh file is created: use the ADO story id (`-<story_id>`) when available in `ado` mode, otherwise a UTC run timestamp (`-yyyymmdd-hhmmss`). The suffixed name must still satisfy the kebab lint pattern `^[a-z0-9]+(-[a-z0-9]+)*\.robot$`. Locator, page-object, and config layers are still extended in place (Phases 2–4) — only the test suite is created new per run.
10. `Resource` the page-object keyword files and `common.resource`; set `Suite Setup`/`Suite Teardown`; add `Force Tags    ADO-Story-<id>`.
11. **By default, emit ONE single `Test Case` that runs all ADO test cases in order as one end-to-end flow.** Do NOT emit one `Test Case` per test case unless a split is explicitly called for (workflow input / caller requests separate tests, a test case is explicitly marked independent/standalone, or isolation is explicitly requested).
    - Tag the single flow with every ADO id: `[Tags]    ADO-TC-<id1>    ADO-TC-<id2>    ...` (ado mode) or a source-file/scenario tag (raw-file mode).
    - Precede each ADO test case's steps with a `Log    ▶ <TC id> — <TC title>` grouping.
    - Order the test-case steps to preserve any required sequence — in whichever direction the scenario dictates (UI before a dependent API/back-office check, or the reverse, and vice versa).
    - Each step calls a page-object keyword only — no raw AppiumLibrary keywords or locator strings.
    - Assertions use dedicated `Verify ... / ... Should ...` page-object keywords.
    - **When splitting is explicitly called for:** emit one `Test Case` per ADO test case instead, each tagged `[Tags]    ADO-TC-<id>`.
    - **When `log_level` is `step`/`action`:** add `Log    ▶ <step description>` before each step grouping.
    - **When `screenshot_mode` is `all`:** `Capture Page Screenshot    ${SCREENSHOT_DIR}/<kebab-test>-<kebab-step>.png` after each step.
    - Never embed credentials/URLs/PII in names, `Log`, tags, or screenshot paths — reference values generically and pull from config/test-data variables.
12. Write all generated file contents to `mobile/artifacts/tests/` under the `resources/`, `libraries/`, and `tests/` subdirectories.

## Phase 6 — Generate `robot.yaml` + `requirements.txt`
13. **Skip when `robot_project_mode` is `existing`**; add a `conversion_warnings` note referencing `robot_config_path`.
14. When `new`: if `robot.yaml` already exists at the repo root, add a warning and skip; otherwise generate `robot.yaml` (run task `robot --outputdir <report_output_path> <test_output_path>/tests`) and `requirements.txt` (`robotframework`, `robotframework-appiumlibrary`, `Appium-Python-Client`).
15. Write generated config to `mobile/artifacts/`.

# Outputs
```json
{
  "story_title": "string",
  "locator_files": [ { "file_path": "string", "locator_count": 0, "screen_name": "string" } ],
  "page_object_files": [ { "file_path": "string", "keyword_count": 0, "screen_name": "string" } ],
  "suite_files": [ { "file_path": "string", "test_count": 0, "scenario_ids": ["string"] } ],
  "config_files": ["string"],
  "library_files": ["string"],
  "robot_config_file": "mobile/artifacts/robot.yaml | null",
  "report_locations": {
    "output_xml": "<report_output_path>/output.xml",
    "log_html": "<report_output_path>/log.html",
    "report_html": "<report_output_path>/report.html"
  },
  "conversion_warnings": ["string"]
}
```

# Quality Gate
> After writing files, run `mobile/scripts/lint-robot-pom.ps1 -TestDir <resolved test_dir>` and fix any reported rows before finishing.
- Every fetched or parsed test case is either converted to a step grouping within the single-flow `Test Case` (default) or its own `Test Case` (when splitting is explicitly called for), or listed under `conversion_warnings`.
- No test suite contains raw locator strings or raw AppiumLibrary interaction keywords — all interactions go through page-object keywords.
- Every page-object resource imports only its corresponding locator resource (plus `common.resource`).
- No locator resource contains a `*** Keywords ***` section or AppiumLibrary import.
- `libraries/VersionLocators.py` is present and `common.resource` exposes `${APP_VERSION}` and the `Resolve Locator` keyword.
- By default there is exactly ONE `Test Case` (the single sequential flow) tagged with every ADO test case id in `ado` mode; multiple `Test Case`s appear only when a split is explicitly called for, each with its own `ADO-TC-<id>` tag. In `raw-file` mode a tag/comment citing the source file and scenario title.
