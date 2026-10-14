---
name: ui-build-tests-from-ado
description: "Use when converting user story and test cases (from ADO links or a raw local file) into POM-structured Playwright files: object repository locator files, page class files, and spec files that use only page classes."
model: GPT-5.3-Codex
---

# Purpose
Fetch or parse test scenarios, combine with app analysis POM definitions, and generate a full three-layer Playwright test suite: Object Repository (locator files), Page Classes, and Spec files.

> **Conform to the detected project structure.** When `analysis.project_structure.detected` is `true`, this agent MUST place files under the detected `test_dir` using the detected folder names, file-naming conventions, import paths, logging style, and `as const` usage — and MUST extend existing files (locators, page classes, hybrid fixture) in place rather than create duplicate/parallel structures. The layout below is the fallback used only when no existing structure is detected.

# POM File Layout (under `test_output_path`)
```
<test_output_path>/
  locators/
    <page>.locators.ts        ← Object Repository — pure locator constants per page
    shared-components.locators.ts
  pages/
    <page>.page.ts            ← Page Object class — imports locators, exposes action methods
  specs/
    <story-kebab>.spec.ts     ← Test spec — imports page objects only, no raw selectors
playwright.config.ts          ← Repo root — reporters, testDir, baseURL (generated once; skipped if exists)
```

# Inputs
- `input_source` — `ado` (default) or `raw-file`; controls Phase 1 branch
- `user_story_ado_link` — full ADO URL for the user story; use this **or** `user_story_id`; required when `input_source` is `ado`
- `user_story_id` — numeric ADO work item ID (e.g. `1326051`); use this **or** `user_story_ado_link`
- `test_cases_ado_link` — full ADO test plan/suite URL; use this **or** the `test_plan_id` + `test_suite_id` pair; required when `input_source` is `ado`
- `test_plan_id` — numeric ADO test plan ID; use with `test_suite_id` as an alternative to `test_cases_ado_link`
- `test_suite_id` — numeric ADO test suite ID; use with `test_plan_id` as an alternative to `test_cases_ado_link`
- `raw_input_file` — required when `input_source` is `raw-file`; path to local `.md`, `.txt`, `.json`, or a Test Cases workflow `.xlsx`/`testcase-generator .json` (auto-converted via `testcase-excel-to-rawinput`)
- `analysis` — output from `ui-analyze-app` (`project_structure`, `page_definitions`, `shared_component_locators`, `auth_pattern`, `existing_pom_files`). When `analysis.project_structure.detected` is `true`, its `test_dir`, `folders`, `naming_conventions`, and `conventions` **override** the defaults below and dictate exact file placement, naming, and code style.
- `test_output_path` — used only as a fallback when `analysis.project_structure.detected` is `false`
- `report_output_path` (default: `playwright-report`) — passed to `playwright.config.ts` HTML reporter
- `screenshot_mode` — `all` | `on-failure` | `none` (default: `on-failure`); controls inline `page.screenshot()` calls and `playwright.config.ts` `screenshot` value
- `log_level` — `step` | `action` | `none` (default: `step`); controls `console.log` emission in page classes and spec steps
- `playwright_project_mode` — `new` or `existing` (default: `new`)
- `playwright_config_path` — path to existing config in `target_repo`; required when `playwright_project_mode` is `existing`
- `spec_name_override` (optional)

# Environment
- `ADO_PAT`
- `ADO_ORG`
- `ADO_PROJECT`
- `APP_BASE_URL`

# Procedure

## Phase 1 — Resolve Test Scenarios

**Branch A — `input_source` is `ado`** (ADO fetch, current behaviour)
1. Resolve ADO identifiers **deterministically** by running `ui/scripts/parse-ado-refs.ps1 -ConfigPath ui/config/workflow-input.current.json`. Use the emitted `work_item_id`, `plan_id`, `suite_id`, `org`, `project` directly — do not parse ADO URLs by hand.
2. Before each ADO call, run `ui/scripts/assert-ado-operation.ps1 -Operation <tool_name>`.
3. Fetch user story via `mcp_ado_wit_get_work_item` using the resolved work item ID.
4. Fetch test cases via `mcp_ado_testplan_list_test_cases` using the resolved plan ID and suite ID.
5. Normalize scenarios into structured step/assertion pairs using `ado-testcase-parser` skill.

**Branch B — `input_source` is `raw-file`** (local file, no ADO calls in this phase)
1. Verify `raw_input_file` is set and non-empty; abort with a clear error if not.
2. **If `raw_input_file` ends in `.xlsx` (a Test Cases workflow Excel) or is a `testcase-generator` `.json`**, first convert it with the `testcase-excel-to-rawinput` skill:
   - Run the skill's AppLocker-safe inline conversion to produce a sibling `<basename>.rawinput.json` (or `.md`) in the same folder.
   - Use `spec_name_override` as `story_title_override` when supplied.
   - Treat the produced `.rawinput.json` as the effective `raw_input_file` for the next step, and carry over its `conversion_warnings`.
   - A plain `.md`, `.txt`, or `.json` that already matches the raw-input schema needs no conversion — skip this step.
3. Read the (possibly converted) file from disk.
4. Parse using `raw-input-parser` skill — detects format (JSON / Markdown / plain text) and produces `story_title` and `test_scenarios[]` in the same shape as `ado-testcase-parser`.
5. If `spec_name_override` is supplied and the file has no story title, use `spec_name_override` as `story_title`.
6. Record source in build metadata as `"input_source": "raw-file", "raw_input_file": "<filename>"`; when a conversion occurred, also record `"converted_from": "<original .xlsx/.json path>"`. This is used in PR description (Phase 4 of `create-ado-pr`) instead of an ADO story URL.

## Phase 2 — Generate Object Repository (`locators/`)
> Resolve the base output directory first: use `analysis.project_structure.test_dir` and `analysis.project_structure.folders` when `detected` is `true`; otherwise fall back to `test_output_path` with default `locators/`, `pages/`, `specs/` folders. Match the detected `naming_conventions` and `conventions` (import paths, header comments, `as const`, logging) exactly. If a target file already exists (listed in `analysis.existing_pom_files`), **modify it in place** — add new locator keys / methods without removing existing ones — instead of overwriting.
5a. **Always emit the version resolver `locators/resolve-locator.ts`** (pure TypeScript, no Playwright imports) using the canonical template in `.github/ui/instructions/playwright-agent-rules.instructions.md` → **Version-Scoped Locators**. It exports `LocatorValue`, `VersionedLocator`, and `resolveLocator(value, appVersion)`. Generate it once; skip if it already exists.
5b. **Ensure `config/test-config.ts` exposes `appVersion`** sourced from `process.env.APP_VERSION` (default `'0.0.0'`). `process.env.APP_VERSION` is read only inside `config/test-config.ts`. Add the field in place if the config already exists.
6. For each page in `analysis.page_definitions`, emit `locators/<page>.locators.ts`:
   - Export a single `const` named `<PageName>Locators` containing all locator key-value pairs.
   - No Playwright imports; pure TypeScript constants only.
   - Values are plain selector strings by default; a value becomes a version-scoped object only when the healer records multiple app versions. Either shape is consumed the same way (via `resolveLocator`).
7. Emit `locators/shared-components.locators.ts` from `analysis.shared_component_locators`.

## Phase 3 — Generate Page Classes (`pages/`)
8. For each page in `analysis.page_definitions`, emit `pages/<page>.page.ts`:
   - Class named `<PageName>Page`, constructor accepts Playwright `Page`.
   - Import locators only from the corresponding `locators/<page>.locators.ts`.
   - **Always import `resolveLocator` from `locators/resolve-locator.ts` and `config` from `config/test-config.ts`, and resolve every locator through it**: `this.page.locator(resolveLocator(<PageName>Locators.<key>, config.appVersion))`. This is mandatory even for plain-string locators (the resolver returns them unchanged), so the healer can later make any locator version-scoped without ever editing this page class.
   - Implement every method listed in `page_definitions.action_methods`.
   - `goto()` must call `this.page.goto(route)`.
   - All Playwright interactions must reference locator constants — never inline selector strings.
   - Add JSDoc to each method citing the locator constant and ADO scenario context.
   - **When `log_level` is `action`:** add `console.log('[<PageName>] <methodName> — start')` and `console.log('[<PageName>] <methodName> — done')` around every public method body.

## Phase 4 — Generate Spec Files (`specs/`)
9. Derive spec file name from `story_title` in kebab-case unless `spec_name_override` is supplied.
10. Group all `test()` blocks under `test.describe('<story_title>', ...)`.
11. **By default, emit ONE single sequential `test()` block that runs all ADO test cases in order as one end-to-end flow.** Do NOT emit one `test()` per test case unless a split is explicitly called for (workflow input / caller requests separate tests, a test case is explicitly marked independent/standalone, or isolation is explicitly requested).
    - Inside the single `test()`, map each ADO test case to a top-level `test.step('<TC id> — <TC title>', async () => { ... })`, annotated with the ADO test case ID in a comment directly above it.
    - Wrap each ADO test case step in a nested `test.step('description', async () => { ... })` call matching the step name from ADO.
    - Order the test-case steps to preserve any required sequence — in whichever direction the scenario dictates (UI before a dependent API call, or API before a dependent UI check, and vice versa); the single-flow default guarantees this ordering under `fullyParallel: true`.
    - Steps call page class action methods only — no raw `page.locator()` or `page.getByRole()`.
    - Assertions use return values from page class getter methods or `expect(page).toHaveURL()`.
    - **When splitting is explicitly called for:** emit one `test()` block per ADO test case instead, each annotated with its ADO test case ID, still grouped under the same `test.describe`.
    - **When `log_level` is `step` or `action`:** add `console.log('▶ <step description>')` as the first line inside every `test.step()` callback.
    - **When `screenshot_mode` is `all`:** add `await page.screenshot({ path: 'test-results/screenshots/<kebab-test-name>-<kebab-step-name>.png' })` as the last line inside every `test.step()` callback.
12. Emit `beforeEach` that instantiates all required page objects and runs auth via login page class when `analysis.auth_pattern` is not `none`.
13. Write all generated file contents to `ui/artifacts/tests/` under the `locators/`, `pages/`, and `specs/` subdirectories.

## Phase 5 — Generate `playwright.config.ts`
14. **Skip this phase entirely when `playwright_project_mode` is `existing`**. Add a note to `conversion_warnings`: `"playwright_project_mode=existing: playwright.config.ts generation skipped; using existing config at <playwright_config_path>."`
15. When `playwright_project_mode` is `new`: check if `playwright.config.ts` already exists at the root of `target_repo`. If it does, add a warning and skip.
16. Generate `playwright.config.ts` using the template from `playwright-test-generator` skill:
    - `testDir` set to `./<test_output_path>`
    - HTML reporter `outputFolder` set to `report_output_path`
    - `baseURL` set to `process.env.APP_BASE_URL`
    - `screenshot` value mapped from `screenshot_mode`: `all` → `'on'`, `on-failure` → `'only-on-failure'`, `none` → `'off'`
    - Reporters: `html`, `json` (`test-results/results.json`), `junit` (`test-results/junit.xml`), `list`
    - `outputDir` set to `'test-results'`
    - `trace` set to `'on-first-retry'`, `video` set to `'retain-on-failure'`
17. Write generated config to `ui/artifacts/playwright.config.ts`.

# Outputs
```json
{
  "story_title": "string",
  "locator_files": [
    { "file_path": "string", "locator_count": 0, "page_name": "string" }
  ],
  "page_class_files": [
    { "file_path": "string", "method_count": 0, "page_name": "string" }
  ],
  "spec_files": [
    { "file_path": "string", "test_count": 0, "scenario_ids": ["string"] }
  ],
  "playwright_config_file": "ui/artifacts/playwright.config.ts | null",
  "report_locations": {
    "html": "<report_output_path>/index.html",
    "json": "test-results/results.json",
    "junit": "test-results/junit.xml"
  },
  "conversion_warnings": ["string"]
}
```

# Quality Gate
> **Run the deterministic lint instead of eyeballing structure.** After writing files, run `ui/scripts/lint-playwright-pom.ps1 -TestDir <resolved test_dir>` (the detected `analysis.project_structure.test_dir`, else `test_output_path`). Fix any reported rows and re-run before finishing — this enforces the no-raw-selectors / no-tests-in-pages / kebab-spec-name rules below deterministically.

- Every fetched or parsed test case is either converted to a `test.step()` (default single-flow) or a `test()` block (when splitting is explicitly called for), or listed under `conversion_warnings`.
- No spec file contains raw selector strings — all interactions go through page class methods.
- Every page class file imports only from its corresponding locator file.
- No locator file contains Playwright imports.
- `locators/resolve-locator.ts` is present and every page-class locator use goes through `resolveLocator(<PageName>Locators.<key>, config.appVersion)`; `config/test-config.ts` exposes `appVersion` from `APP_VERSION`.
- By default there is exactly ONE `test()` block (the single sequential flow); multiple `test()` blocks appear only when a split is explicitly called for. Each ADO test case is annotated with its ADO test case ID (on its `test.step()` in single-flow mode, or on its `test()` when split) when `input_source` is `ado`; when `input_source` is `raw-file`, cite the source file name and scenario title instead.
