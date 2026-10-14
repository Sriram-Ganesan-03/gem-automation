# UI Automation Workflow (Playwright)

Converts a user story (from ADO **or** a local text/markdown file) and test cases into a POM-structured Playwright TypeScript test suite, writes the files **directly into the project the `.github` folder lives in** (conforming to that project's existing structure), and optionally commits them to a feature branch and opens an ADO pull request — all driven by GitHub Copilot agents.

> The `.github` folder always lives **inside** the target project, so the **project root is auto-derived** as the repository/workspace root that contains `.github`. `target_local_path` is an optional override only.

---

## How It Works

```
ADO User Story + Test Cases
  OR
Local .md / .txt / .json file
         │
         ▼
┌─────────────────────┐
│  analyze-app        │  STEP 0 (always first): analyzes the LOCAL project
│                     │  structure at the auto-derived project root — detects
│                     │  testDir, locators/pages/specs/config/api layout, file
│                     │  naming, import style, log style, existing files.
│                     │  Then navigates the live app with Playwright MCP,
│                     │  extracting locators, routes, action flows →
│                     │  POM page definitions + shared locators.
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  build-tests-       │  Phase 1 depends on input_source:
│  from-ado           │    ado      → fetches ADO work items (read-only)
│                     │    raw-file → reads local file, parses scenarios
│                     │  Phases 2-5: generates the three POM layers
│                     │    locators/  pages/  specs/  — CONFORMING to the
│                     │  detected structure and EXTENDING existing files
│                     │  in place. Generates playwright.config.ts only in
│                     │  'new' mode (skipped when 'existing').
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  build-api-layer    │  OPTIONAL — runs only when api_layer.enabled = true.
│  (hybrid API + UI)  │  Generates tests/api/ clients + schemas from an
│                     │  OpenAPI/Postman/manual source, registers them into
│                     │  the existing hybrid.fixture.ts, and (when
│                     │  emit_hybrid_spec_stubs) writes *.hybrid.spec.ts.
│                     │  Never edits locators/ or pages/.
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  heal-tests         │  OPTIONAL — runs only when self_healing.enabled = true.
│  (self-healing)     │  Three tasks:
│                     │    heal-failures  → consumes a Playwright JSON report,
│                     │        repairs broken locators by re-inspecting the
│                     │        live a11y tree, returns a re-run command.
│                     │    validate-version → after an app upgrade, verifies
│                     │        locators on the new version and keeps per-
│                     │        version selectors (old + new both pass).
│                     │    audit → read-only health check of all locators
│                     │        (ok/broken/skipped); writes nothing.
│                     │  Report-driven by default (you run Playwright).
│                     │  Edits ONLY locators/ (audit edits nothing).
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  create-ado-pr      │  Writes all generated files DIRECTLY into the project
│                     │  root (dry-run and execute). In execute mode also:
│                     │  creates feature branch, commits POM + api files,
│                     │  opens ADO PR with reviewer, links ADO work item
│                     │  (ado mode) or notes source file (raw-file mode).
└─────────────────────┘
```

---

## Folder Structure

```
ui/
  agents/
    orchestrator.agent.md          ← Entry point; coordinates all agents
    analyze-app.agent.md           ← Agent 1: Step 0 structure scan + Playwright MCP app analysis
    build-tests-from-ado.agent.md  ← Agent 2: POM file generation (structure-conforming)
    build-api-layer.agent.md       ← Agent 3 (optional): hybrid API layer (api_layer.enabled)
    heal-tests.agent.md            ← Agent 4 (optional): locator self-healing / version validation (self_healing.enabled)
    create-ado-pr.agent.md         ← Agent 5: local write + ADO branch/PR creation
  config/
    workflow-input.example.json    ← Template — copy to workflow-input.current.json
    workflow-schema.json           ← JSON Schema validating workflow input
    agent-config.json              ← Agent registry and env/input reference
    ado-operation-guardrails.json  ← ADO tool allow/block list (fail-closed)
  instructions/
    playwright-agent-rules.instructions.md      ← Hard rules for all UI agents
    playwright-orchestrator.instructions.md     ← Orchestrator-specific rules
    execution-checklist.instructions.md         ← Pre-run validation checklist
  scripts/
    preflight-guardrails.ps1       ← Validates config before any run
    assert-ado-operation.ps1       ← Gates every individual ADO tool call
    parse-ado-refs.ps1             ← Deterministic ADO URL → org/project/work-item/plan/suite IDs
    lint-playwright-pom.ps1        ← Deterministic POM lint (no raw selectors in specs; no tests in pages)
    apply-playwright-tests.ps1     ← Manual recovery: copies artifacts to target path
  skills/
    ado-testcase-parser/           ← Parses ADO work items into structured steps
    playwright-app-analysis/       ← Produces POM definitions from Playwright snapshots
    playwright-test-generator/     ← Generates all three POM layers from analysis
    ui-ado-pr-management/          ← Creates ADO branch/PR from POM artifacts
  artifacts/                       ← Agent working output (auto-generated, not checked in)
```

---

## Prerequisites

### Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `APP_BASE_URL` | Yes | Base URL of the application under test |
| `ADO_PAT` | Yes | Azure DevOps Personal Access Token |
| `ADO_ORG` | Yes | ADO organisation name (e.g., `everi`) |
| `ADO_PROJECT` | Yes | ADO project name (e.g., `Loyalty Kiosk`) |
| `APP_USERNAME` | When `app_auth_strategy` is `env-var` | Login username |
| `APP_PASSWORD` | When `app_auth_strategy` is `env-var` | Login password |
| `APP_VERSION` | When `self_healing.heal_task` is `validate-version` | Semver of the app under test (e.g. `2.5.0`); drives version-scoped locator resolution via `config.appVersion` |

### Azure DevOps MCP server (PAT authentication)

This workflow authenticates to Azure DevOps using a **Personal Access Token** — no browser sign-in — via the Microsoft official [`@azure-devops/mcp`](https://github.com/microsoft/azure-devops-mcp) server launched through a small PAT wrapper ([scripts/ado-mcp-launcher.ps1](scripts/ado-mcp-launcher.ps1)). Configure it in your VS Code `mcp.json`:

```jsonc
"inputs": [
  { "id": "adoPat", "type": "promptString", "description": "Azure DevOps PAT", "password": true }
],
"servers": {
  "ado": {
    "type": "stdio",
    "command": "pwsh",
    "args": [
      "-NoProfile", "-File",
      "d:\\EveriTools\\loyalty-automation-agent\\.github\\ui\\scripts\\ado-mcp-launcher.ps1"
    ],
    "env": { "ADO_RAW_PAT": "${input:adoPat}" }
  }
}
```

The wrapper reads the raw PAT from `ADO_RAW_PAT`, base64-encodes it as `email:pat` into `PERSONAL_ACCESS_TOKEN`, and runs `@azure-devops/mcp everi --authentication pat` with the `core work work-items search test-plans repositories` domains. Using `${input:adoPat}` keeps the token in VS Code secret storage (entered once, cached until rotated) instead of any file. The PAT needs **Work Items: Read**, **Test Management: Read**, **Code: Read & Write**, and **Pull Request: Read & Write** scopes. Allowed/blocked tool names are enforced by [config/ado-operation-guardrails.json](config/ado-operation-guardrails.json) using the Microsoft tool names (`mcp_ado_wit_*`, `mcp_ado_repo_*`, `mcp_ado_testplan_*`).

> Verify with *"List ADO projects"* in Copilot Chat — it should return results **without** opening a browser. If a browser opens, the launcher wrapper is not being used.

---

## Configuration

Copy `config/workflow-input.example.json` to `config/workflow-input.current.json` and fill in your values. The `current.json` file is the live run input consumed by the agents.

### All Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `app_base_url` | string (URI) | Yes | — | Base URL of the app (e.g., `https://kiosk-staging.everi.com`) |
| `app_auth_strategy` | `none` \| `env-var` \| `cookie-file` | Yes | — | How the agent authenticates before analysing protected routes |
| `test_output_path` | string | Yes | `tests/e2e` | Folder (under the project root) where POM files are written. **Overridden** by the `testDir` detected in the existing `playwright.config.ts` when a project structure is found (Step 0), so files land in the project's real layout (e.g., `tests`). |
| `report_output_path` | string | No | `playwright-report` | Folder where Playwright HTML report is written after test execution; ignored when `playwright_project_mode` is `existing` |
| `playwright_project_mode` | `new` \| `existing` | No | `new` | `new` — agents generate `playwright.config.ts`. `existing` — target repo already has a Playwright project; config generation is skipped |
| `playwright_config_path` | string \| null | When mode is `existing` | `null` | Relative path to `playwright.config.ts` inside `target_repo` (e.g., `playwright.config.ts`, `e2e/playwright.config.ts`) |
| `input_source` | `ado` \| `raw-file` | Yes | `ado` | Where test scenarios come from. `ado` — fetch from Azure DevOps. `raw-file` — read from a local file. |
| `raw_input_file` | string \| null | When `input_source` is `raw-file` | `null` | Path to a local `.md`, `.txt`, or `.json` file — or a Test Cases workflow `.xlsx` / `testcase-generator .json` (auto-converted). See [Raw File Format](#raw-file-format) and [Test Cases Workflow Output](#test-cases-workflow-output-xlsx--testcase-generator-json). |
| `user_story_ado_link` | string (URI) \| null | When `input_source` is `ado` | — | ADO work item URL for the user story |
| `test_cases_ado_link` | string (URI) \| null | When `input_source` is `ado` | — | ADO test plan/suite URL containing the test cases |
| `reviewer_ado_user_id` | string | When `run_mode` is `execute` | — | ADO user email or GUID for the PR reviewer |
| `target_repo` | string | When `run_mode` is `execute` | — | ADO Git repository name (e.g., `loyalty-kiosk-ui`) |
| `target_branch` | string | When `run_mode` is `execute` | `main` | Branch to fork the feature branch from |
| `target_local_path` | string \| null | No | `null` | **Optional override.** The `.github` folder always lives inside the target project, so the project root is **auto-derived** as the repository/workspace root that contains `.github`. Generated files are written **directly** into that project by default — `locators/pages/specs` (and the api layer) under the detected `testDir` / `<test_output_path>`, and `playwright.config.ts` at its root (`new` mode) — in both `dry-run` and `execute` modes, independent of the ADO PR. `ui/artifacts/` keeps a mirror copy only. Set this only to point at a **different** directory than the auto-derived root. |
| `spec_name_override` | string \| null | No | `null` | Override the spec file name (kebab-case, without `.spec.ts`); defaults to story title if null |
| `target_pages` | string[] | No | `[]` | URL paths to restrict analysis to (e.g., `["/login", "/dashboard"]`); empty means analyse all reachable pages |
| `screenshot_mode` | `all` \| `on-failure` \| `none` | No | `on-failure` | When to capture screenshots. `all` adds a screenshot at the end of every `test.step()`. |
| `log_level` | `step` \| `action` \| `none` | No | `step` | `step` — `console.log` at each test step. `action` — also logs inside every page class method. `none` — silent. |
| `run_mode` | `dry-run` \| `execute` | Yes | `dry-run` | `dry-run` — generates artifacts only, no ADO writes. `execute` — creates branch, commits files, opens PR |
| `execution_confirmation` | `"APPROVED_EXECUTE"` \| null | When `run_mode` is `execute` | `null` | Must be `"APPROVED_EXECUTE"` to unlock execute mode |
| `allow_ado_mutation` | boolean | — | `false` | Guard rail constant — must always be `false` |
| `allow_probe_resources` | boolean | — | `false` | Guard rail constant — must always be `false` |
| `ado_access_mode` | string | — | `"read-only"` | Guard rail constant — must always be `"read-only"` |
| `ado_tool_calls_mode` | string | — | `"read-wrapper-only"` | Guard rail constant — must always be `"read-wrapper-only"` |
| `ado_write_tools_disabled` | boolean | — | `true` | Guard rail constant — must always be `true` |
| `api_layer` | object \| null | No | `null` | Optional hybrid **API + UI** stage. When `enabled: true`, `build-api-layer` generates `tests/api/` clients + Zod schemas from `api_source` (`openapi` \| `postman` \| `manual` \| `curl`) and registers them into the existing `hybrid.fixture.ts`. Key sub-fields: `api_base_url`, `api_auth_strategy`, `postman_collection_path` / `openapi_spec_path` / `manual_endpoints` / `curl_commands` / `curl_source_file`, `domains`, `schema_validation` (`strict` \| `warn` \| `off`), `emit_hybrid_spec_stubs`. With `api_source: curl`, paste one or more raw curl commands into `curl_commands` or point `curl_source_file` at a file (e.g. `input.txt`); secret-looking headers are mapped to env-var names only. Omit or set `null` to skip the API stage entirely. |
| `self_healing` | object \| null | No | `null` | Optional **locator self-healing** stage. When `enabled: true`, `heal-tests` runs after test generation and before PR creation. Sub-fields: `heal_task` (`heal-failures` \| `validate-version` \| `audit`), `heal_mode` (`report-driven` \| `agent-run`), `results_report_path` (default `test-results/results.json`), `app_version` / `previous_app_version` (required for `validate-version`), `max_attempts_per_locator`, `max_total_reruns`, `heal_shared_locators`, `strategy` (`semantic-first` \| `testid-first`). `audit` is read-only; `heal-failures` and `validate-version` edit **only** `locators/`. Omit or set `null` to skip. See [Self-Healing Locators](#self-healing-locators). |

---

## Scenario A — New Playwright Project (ADO input)

Use this when the target repo has no existing Playwright setup and your test cases are in ADO. The agents generate `locators/`, `pages/`, `specs/`, and `playwright.config.ts` from scratch.

```json
{
  "app_base_url": "https://kiosk-staging.everi.com",
  "app_auth_strategy": "env-var",
  "test_output_path": "tests/e2e",
  "report_output_path": "playwright-report",
  "screenshot_mode": "on-failure",
  "log_level": "step",
  "playwright_project_mode": "new",
  "playwright_config_path": null,

  "input_source": "ado",
  "raw_input_file": null,
  "user_story_ado_link": "https://dev.azure.com/everi/Loyalty%20Kiosk/_workitems/edit/1326051",
  "test_cases_ado_link": "https://dev.azure.com/everi/Loyalty%20Kiosk/_testPlans/execute?planId=432931&suiteId=1329228",
  "reviewer_ado_user_id": "aravind.shanmugam@everi.com",
  "target_repo": "loyalty-kiosk-ui",
  "target_branch": "main",

  "spec_name_override": null,
  "target_pages": [],

  "run_mode": "dry-run",
  "execution_confirmation": null,
  "allow_ado_mutation": false,
  "allow_probe_resources": false,
  "ado_access_mode": "read-only",
  "ado_tool_calls_mode": "read-wrapper-only",
  "ado_write_tools_disabled": true
}
```

**What gets generated:**

```
<target_repo>/
  playwright.config.ts             ← committed to repo root
  tests/e2e/
    locators/
      login.locators.ts
      shared-components.locators.ts
    pages/
      login.page.ts
    specs/
      user-login.spec.ts
```

**Report locations after `npx playwright test`:**

```
playwright-report/index.html       ← HTML report
test-results/results.json          ← JSON results
test-results/junit.xml             ← JUnit XML (ADO pipeline integration)
test-results/<test-name>/
  trace.zip
  screenshot.png
```

---

## Scenario B — Existing Playwright Project

```json
{
  "app_base_url": "https://kiosk-staging.everi.com",
  "app_auth_strategy": "env-var",
  "test_output_path": "e2e/tests",
  "report_output_path": "e2e/reports",
  "playwright_project_mode": "existing",
  "playwright_config_path": "playwright.config.ts",

  "user_story_ado_link": "https://dev.azure.com/everi/Loyalty%20Kiosk/_workitems/edit/1326051",
  "test_cases_ado_link": "https://dev.azure.com/everi/Loyalty%20Kiosk/_testPlans/execute?planId=432931&suiteId=1329228",
  "reviewer_ado_user_id": "aravind.shanmugam@everi.com",
  "target_repo": "loyalty-kiosk-ui",
  "target_branch": "develop",

  "spec_name_override": "user-login-flow",
  "target_pages": ["/login", "/dashboard"],

  "run_mode": "execute",
  "execution_confirmation": "APPROVED_EXECUTE",
  "allow_ado_mutation": false,
  "allow_probe_resources": false,
  "ado_access_mode": "read-only",
  "ado_tool_calls_mode": "read-wrapper-only",
  "ado_write_tools_disabled": true
}
```

**What gets generated:**

- Only new locator/page files (existing ones are detected and skipped).
- New spec file at `e2e/tests/specs/user-login-flow.spec.ts`.
- `playwright.config.ts` is **not** touched.

**`playwright_config_path` examples by project layout:**

| Repo structure | `playwright_config_path` value |
|---|---|
| Config at repo root | `"playwright.config.ts"` |
| Config inside `e2e/` folder | `"e2e/playwright.config.ts"` |
| Config inside `src/test/` | `"src/test/playwright.config.ts"` |

---

## Scenario C — Raw File Input (no ADO required)

Use this when your test scenarios live in a local markdown or text file — e.g., a user story drafted in a `.md` file, a spec sheet exported from Confluence, or a handwritten `.txt` test plan. ADO link fields are not required.

```json
{
  "app_base_url": "https://kiosk-staging.everi.com",
  "app_auth_strategy": "env-var",
  "test_output_path": "tests/e2e",
  "report_output_path": "playwright-report",
  "screenshot_mode": "on-failure",
  "log_level": "step",
  "playwright_project_mode": "new",
  "playwright_config_path": null,

  "input_source": "raw-file",
  "raw_input_file": "inputs/user-story-1326051.md",
  "reviewer_ado_user_id": "aravind.shanmugam@everi.com",
  "target_repo": "loyalty-kiosk-ui",
  "target_branch": "main",

  "spec_name_override": "user-login-flow",
  "target_pages": ["/login"],

  "run_mode": "dry-run",
  "execution_confirmation": null,
  "allow_ado_mutation": false,
  "allow_probe_resources": false,
  "ado_access_mode": "read-only",
  "ado_tool_calls_mode": "read-wrapper-only",
  "ado_write_tools_disabled": true
}
```

**Notes:**
- `user_story_ado_link` and `test_cases_ado_link` are omitted — not needed in `raw-file` mode.
- The PR description will reference the source file name instead of an ADO story URL.
- Work item linking in the PR is skipped (no ADO story to link to).

### Raw File Format

The `raw_input_file` supports three formats:

**Markdown (`.md`)** — recommended

```markdown
# Story Title: User Login

## Test Case: Valid credentials login
**Steps:**
1. Navigate to the login page
2. Enter a valid username in the username field
3. Enter a valid password in the password field
4. Click the Submit button

**Expected Result:** User is redirected to the dashboard page.

---

## Test Case: Invalid credentials shows error
**Steps:**
1. Navigate to the login page
2. Enter an invalid username
3. Enter a wrong password
4. Click the Submit button

**Expected Result:** An error message "Invalid credentials" is displayed.
```

**Plain Text (`.txt`)**

```
Story: User Login

Test Case: Valid credentials login
Steps:
1. Navigate to the login page
2. Enter a valid username
3. Click Submit
Expected Result: Redirected to dashboard.
```

**Pre-structured JSON (`.json`)** — for teams that already generate scenario data programmatically

```json
{
  "story_title": "User Login",
  "test_scenarios": [
    {
      "title": "Valid credentials login",
      "steps": [
        { "action": "Navigate to the login page" },
        { "action": "Enter a valid username" },
        { "action": "Click Submit" }
      ],
      "expected_result": "Redirected to dashboard"
    }
  ]
}
```

See [skills/raw-input-parser/SKILL.md](skills/raw-input-parser/SKILL.md) for the full parsing rules.

### Test Cases Workflow Output (`.xlsx` / testcase-generator `.json`)

You can feed the **Test Cases workflow** output straight into `raw-file` mode without hand-writing a `.md`/`.txt`. Point `raw_input_file` at either:

- the `.xlsx` workbook produced by the Test Cases `excel-exporter` (canonical 11-column layout), or
- the `testcase-generator` `.json` output.

```json
{
  "input_source": "raw-file",
  "raw_input_file": "inputs/PAAS-Query-API-testcases.xlsx",
  "spec_name_override": "query-api-flow"
}
```

The build agent auto-converts it via the [testcase-excel-to-rawinput](skills/testcase-excel-to-rawinput/SKILL.md) skill into a sibling `<basename>.rawinput.json` (shaped exactly like the pre-structured JSON above), then parses it through `raw-input-parser`. The 11 columns map as: `Title` → scenario title, `Step Action` rows → `steps[]`, last-step `Expected Result` → `expected_result`, and `Preconditions` / `Type` / `Test Data` → `test_data`. Conversion uses the `ImportExcel` PowerShell module — `preflight-guardrails.ps1` detects an `.xlsx` `raw_input_file` and installs the module on demand (`Install-Module ImportExcel -Scope CurrentUser`), the same auto-install pattern used for npm dependencies.

See [skills/testcase-excel-to-rawinput/SKILL.md](skills/testcase-excel-to-rawinput/SKILL.md) for the full column contract and mapping.

---

## Running the Agent

Run the workflow end-to-end with the steps below. Start in `dry-run` mode, review the generated artifacts, then switch to `execute` mode to create the branch and PR.

### Step 0 — Set environment variables

Secrets are **never** stored in `workflow-input.current.json` (its `ado_pat` and `app_password` fields are kept `null` and the file is gitignored). Supply them as environment variables instead — preflight reads them automatically as the fallback for the null JSON fields:

```powershell
$env:APP_BASE_URL = "https://kiosk-staging.everi.com"
$env:ADO_PAT      = "<your-personal-access-token>"   # required — read from env, not the JSON
$env:ADO_ORG      = "everi"
$env:ADO_PROJECT  = "Loyalty Kiosk"
# Only when app_auth_strategy is env-var:
$env:APP_USERNAME = "<login-username>"
$env:APP_PASSWORD = "<login-password>"               # required — read from env, not the JSON
```

> These persist only for the current PowerShell session. Re-set them in each new terminal, or add them to a gitignored `.env` file.

### Step 1 — Validate config

```powershell
pwsh ui/scripts/preflight-guardrails.ps1 -ConfigPath ui/config/workflow-input.current.json
```

All checks must pass before proceeding.

### Step 2 — Invoke the orchestrator

Open GitHub Copilot Chat in VS Code, select the **`ui-testcase-orchestrator`** agent from the mode picker (or type its handle), and send this exact message to start the run:

```
@ui-testcase-orchestrator
```

You do **not** pass any parameters in the chat — the agent reads all inputs (`app_base_url`, `input_source`, `run_mode`, ADO links, etc.) from `ui/config/workflow-input.current.json` automatically, and pulls secrets (`ADO_PAT`, `APP_PASSWORD`) from the environment variables set in Step 0. The handle alone is enough to start the flow.

Optionally, you can add a natural-language nudge alongside the handle — it does not override the config, but can clarify intent:

```
@ui-testcase-orchestrator run in dry-run mode and stop after generating artifacts
```

In `dry-run` mode the agent produces all artifacts without touching ADO. Review the output under `ui/artifacts/` before switching to execute mode.

### Step 3 — Switch to execute mode (when ready)

In `workflow-input.current.json`:

```json
"run_mode": "execute",
"execution_confirmation": "APPROVED_EXECUTE"
```

Run `@ui-testcase-orchestrator` again. The agent creates the branch, commits all files, opens the PR, and assigns the reviewer.

### Manual recovery (if ADO is unreachable)

```powershell
pwsh ui/scripts/apply-playwright-tests.ps1 -ArtifactsPath ui/artifacts/tests -TargetPath <local-repo-path>/tests/e2e
```

Then follow the steps in `ui/artifacts/upload-instructions.json` to commit and create the PR manually.

---

## Self-Healing Locators

The optional **`heal-tests`** agent (`ui-heal-tests`) keeps locators working over time. It edits **only** `locators/` files — never `pages/` or `specs/` — and never weakens assertions. It has two tasks, selected by `self_healing.heal_task`.

### Task 1 — `heal-failures` (repair a broken run)

You run Playwright yourself; when a test fails on a stale/ambiguous locator, the agent consumes the JSON report, re-inspects the live page via Playwright MCP, rewrites the broken locator constant (verified 1-of-1), and hands back a re-run command.

| Failure in the report | Handling |
|---|---|
| Locator-driven (`resolved to 0 elements`, `strict mode violation`, `Timeout waiting for locator`, not attached/visible) | Mapped to its locator constant → live re-inspection → selector rewritten (1-of-1 verified) → `heal.rerun_command` returned |
| Assertion / auth / network / app error | Reported under `non_healable_failures`; **never** patched |
| App unreachable / no Playwright MCP | Skipped with `heal.skipped_reason`; failures passed through unchanged |
| Report missing / unparseable | Stops and tells you to generate it first |

### Task 2 — `validate-version` (after an app upgrade)

Verifies every locator resolves on the new `app_version` and, where a locator changed between versions, **preserves the old-version selector and adds the new one** so runs against either version pass. Healing is **additive** — a still-valid older selector is never deleted.

### Task 3 — `audit` (read-only health check)

Answers "are all my locators still working?" **without changing anything.** It enumerates every locator, resolves it via `resolveLocator(..., config.appVersion)`, navigates each page, and snapshots the live a11y tree to classify each locator:

| Result | Bucket |
|---|---|
| Matches exactly 1 element | `heal.audit.ok` |
| Matches 0 elements | `heal.audit.broken` (`resolved to 0 elements`) |
| Matches >1 element | `heal.audit.broken` (`ambiguous — resolved to N elements`) |
| Page unreachable | `heal.audit.skipped` |

`audit` writes **zero files**, adds no `// HEALED` comments, and returns **no** `rerun_command`. Use it for a non-destructive locator inventory; it confirms each locator uniquely matches an element but does not assert functional correctness (only a real test run does that).

### Task cheat-sheet

| `heal_task` | Trigger | Input | Touches files? | Output |
|---|---|---|---|---|
| **`heal-failures`** (default) | A run failed on a locator | Playwright JSON report (`report-driven`) | Yes — only `locators/` | Healed locators + `heal.rerun_command` |
| **`validate-version`** | App version upgrade | `app_version` + `previous_app_version` | Yes — only `locators/` (additive) | `validated` / version-scoped `healed` / `preserved` |
| **`audit`** | "Are all locators OK?" | none (inspects app directly) | **No** — read-only | `heal.audit.ok` / `broken` / `skipped` |

Across all tasks: **report-driven by default** (you run Playwright unless `heal_mode: agent-run`), every new selector follows the **Locator Discovery & Verification** rules (snapshot-first, semantic priority, relative-XPath-only, 1-of-1 verified), the agent **never edits** `pages/` / `specs/` / `config/` / `playwright.config.ts`, and it **skips gracefully** (`heal.skipped_reason`) when the app is unreachable or Playwright MCP is unavailable.

### Version-scoped locators

The generator always emits a resolver and wires page classes through it up front, so version healing only touches `locators/`:

- `locators/resolve-locator.ts` — pure-TS `resolveLocator(value, appVersion)` (no Playwright imports).
- `config/test-config.ts` — exposes `appVersion` from the `APP_VERSION` env var.
- Page classes call `this.page.locator(resolveLocator(<Page>Locators.<key>, config.appVersion))` for every locator.

A locator value is a plain string by default, or a version-scoped object once healed:

```ts
export const LoginLocators = {
  usernameInput: '#username',                                   // version-agnostic
  // HEALED 2026-08-10 (v2.5.0): '#kc-login' → '[data-testid="login-submit"]'
  signInButton: {
    _versioned: true,
    versions: [
      { since: '2.5.0', selector: '[data-testid="login-submit"]' }, // new version
      { since: '2.4.3', selector: '#kc-login' },                     // old version preserved
    ],
  },
} as const;
```

At runtime `resolveLocator` picks the entry with the highest `since` that is ≤ the current `APP_VERSION`, so `APP_VERSION=2.4.3` → `#kc-login` and `APP_VERSION=2.5.0` → the `data-testid`.

### Running the healer standalone

The healer does **not** require the orchestrator. It reads all settings from `ui/config/workflow-input.current.json` — no parameters are passed in chat.

**1. Enable it in `workflow-input.current.json`:**

```json
"self_healing": {
  "enabled": true,
  "heal_task": "heal-failures",
  "heal_mode": "report-driven",
  "results_report_path": "test-results/results.json",
  "max_attempts_per_locator": 3,
  "max_total_reruns": 5,
  "heal_shared_locators": true,
  "strategy": "semantic-first"
}
```

For version validation instead:

```json
"self_healing": {
  "enabled": true,
  "heal_task": "validate-version",
  "app_version": "2.5.0",
  "previous_app_version": "2.4.3",
  "strategy": "semantic-first"
}
```

For a read-only audit of every locator (writes nothing):

```json
"self_healing": {
  "enabled": true,
  "heal_task": "audit",
  "heal_shared_locators": true
}
```

**2. Set environment variables** (so the agent can reach and re-inspect the app):

```powershell
$env:APP_BASE_URL = "https://kiosk-staging.everi.com"
$env:APP_USERNAME = "<login-username>"     # when app_auth_strategy is env-var
$env:APP_PASSWORD = "<login-password>"
$env:APP_VERSION  = "2.5.0"                 # required for validate-version
```

**3. (heal-failures only) Produce a JSON report by running Playwright yourself:**

```powershell
npx playwright test --reporter=json > test-results/results.json
```

**4. Invoke the agent alone** in GitHub Copilot Chat — select **`ui-heal-tests`** from the mode picker (or type its handle):

```
@ui-heal-tests
```

**5. Confirm the fix.** In report-driven mode the agent returns `heal.rerun_command`; run it and repeat if new locator failures surface.

> **Prerequisites:** Playwright MCP browser tools must be available and the app reachable/authenticated. When run standalone (no orchestrator), the agent reads your existing `pages/` and `locators/` files directly to map failing selectors back to their locator constants.

---

## POM Architecture

All generated test files follow a strict three-layer Page Object Model:

| Layer | Folder | Responsibility |
|---|---|---|
| Object Repository | `locators/` | Pure `export const` locator constants. No Playwright imports. One file per page. |
| Page Classes | `pages/` | TypeScript class importing from its locator file. Wraps every interaction as a named method. |
| Spec Files | `specs/` | `test()` blocks that call page class methods only. Never contain raw selectors. |

**Forbidden in spec files:** `page.locator(...)`, `page.getByRole(...)`, `page.fill(...)` — all interactions must go through a page class method.

---

## Guard Rails

The following fields are fixed constants and must never be changed. The preflight script and `assert-ado-operation.ps1` enforce them at runtime:

| Field | Required value | What it prevents |
|---|---|---|
| `allow_ado_mutation` | `false` | Accidental ADO work item mutations |
| `allow_probe_resources` | `false` | Creation of probe/test ADO resources |
| `ado_access_mode` | `"read-only"` | Unrestricted ADO reads outside the allowed list |
| `ado_tool_calls_mode` | `"read-wrapper-only"` | Direct ADO write tool calls bypassing the gate |
| `ado_write_tools_disabled` | `true` | Any ADO write in dry-run mode |
