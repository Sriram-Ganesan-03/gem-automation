# Mobile Automation Workflow (Robot Framework + Appium + Python)

Converts a user story (from ADO **or** a local text/markdown file) and test cases into a keyword-driven Robot Framework + Appium test suite, writes the files **directly into the project the `.github` folder lives in** (conforming to that project's existing structure), and optionally commits them to a feature branch and opens an ADO pull request — all driven by GitHub Copilot agents.

> The `.github` folder always lives **inside** the target project, so the **project root is auto-derived** as the repository/workspace root that contains `.github`. `target_local_path` is an optional override only.

This is the mobile counterpart of the UI (Playwright) workflow. Instead of a browser it drives a mobile app through an **Appium** session, and instead of TypeScript Page Objects it produces a **keyword-driven Robot Framework** structure in **Python**.

> **Two execution targets, one test suite.** The same generated locators, keywords, and `.robot` suites run against either:
> - **`local`** — a local Appium server driving an **Android Studio** emulator/AVD, a physical device, or an iOS simulator.
> - **`browserstack`** — the **BrowserStack** App Automate cloud device farm (session opens against the BrowserStack hub with `bstack:options`).
>
> Only the generated `resources/config/common.resource` session bootstrap differs — it branches on `${EXECUTION_TARGET}`. Switching targets is a config change, not a code change.

---

## How It Works

```
ADO User Story + Test Cases
  OR
Local .md / .txt / .json / .xlsx file
         │
         ▼
┌─────────────────────┐
│  analyze-app        │  STEP 0 (always first): analyzes the LOCAL project
│                     │  structure at the auto-derived project root — detects
│                     │  the tests root, resources/locators|keywords|config,
│                     │  tests/, libraries/, file naming, existing files.
│                     │  Then starts an Appium session, captures the UI
│                     │  hierarchy per screen → page-object screen definitions
│                     │  (locator variables + keyword signatures) + shared locators.
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  build-tests-       │  Phase 1 depends on input_source:
│  from-ado           │    ado      → fetches ADO work items (read-only)
│                     │    raw-file → reads local file, parses scenarios
│                     │  Phases 2-6: generates the four POM layers
│                     │    resources/config  resources/locators
│                     │    resources/keywords  tests/  — CONFORMING to the
│                     │  detected structure and EXTENDING existing files in
│                     │  place. Generates robot.yaml only in 'new' mode.
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  heal-tests         │  OPTIONAL — runs only when self_healing.enabled = true.
│  (self-healing)     │  Three tasks:
│                     │    heal-failures  → consumes a Robot output.xml,
│                     │        repairs broken locators by re-inspecting the
│                     │        live app, returns a re-run command.
│                     │    validate-version → after an app upgrade, keeps per-
│                     │        version selectors (old + new both pass).
│                     │    audit → read-only health check of all locators.
│                     │  Report-driven by default (you run Robot yourself).
│                     │  Edits ONLY resources/locators/ (audit edits nothing).
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  create-ado-pr      │  Writes all generated files DIRECTLY into the project
│                     │  root (dry-run and execute). In execute mode also:
│                     │  creates feature branch, commits files, opens ADO PR
│                     │  with reviewer, links ADO work item (ado mode) or
│                     │  notes source file (raw-file mode).
└─────────────────────┘
```

---

## Folder Structure

```
mobile/
  agents/
    orchestrator.agent.md          ← Entry point; coordinates all agents
    analyze-app.agent.md           ← Agent 1: Step 0 structure scan + Appium app analysis
    build-tests-from-ado.agent.md  ← Agent 2: RF POM file generation (structure-conforming)
    heal-tests.agent.md            ← Agent 3 (optional): locator self-healing / version validation
    create-ado-pr.agent.md         ← Agent 4: local write + ADO branch/PR creation
  config/
    workflow-input.example.json    ← Template — copy to workflow-input.current.json
    workflow-input.current.json    ← Live run input consumed by the agents
    workflow-schema.json           ← JSON Schema validating workflow input
    agent-config.json              ← Agent registry and env/input reference
    ado-operation-guardrails.json  ← ADO tool allow/block list (fail-closed)
  instructions/
    robot-agent-rules.instructions.md       ← Hard rules for all mobile agents
    robot-orchestrator.instructions.md      ← Orchestrator-specific rules
    execution-checklist.instructions.md     ← Pre-run validation checklist
  scripts/
    preflight-guardrails.ps1       ← Validates config/env before any run; writes .env; optional -InstallDeps
    assert-ado-operation.ps1       ← Gates every individual ADO tool call
    parse-ado-refs.ps1             ← Deterministic ADO URL → org/project/work-item/plan/suite IDs
    lint-robot-pom.ps1             ← Deterministic POM lint (no raw locators in suites; no tests in keyword files)
    apply-robot-tests.ps1          ← Manual recovery: copies artifacts to target path
    ado-mcp-launcher.ps1           ← Azure DevOps MCP PAT launcher (shared pattern)
  skills/
    ado-testcase-parser/           ← Parses ADO work items into structured steps
    raw-input-parser/              ← Parses local .md/.txt/.json into the same scenario shape
    testcase-excel-to-rawinput/    ← Converts Test Cases workflow .xlsx/.json to raw-input
    appium-app-analysis/           ← Produces page-object definitions from Appium inspection
    robot-test-generator/          ← Generates all four RF POM layers from analysis
    mobile-ado-pr-management/      ← Creates ADO branch/PR from RF artifacts
  artifacts/                       ← Agent working output (auto-generated, not checked in)
```

---

## Generated Test Layout (keyword-driven POM)

```
<test_output_path>/           (default: mobile-tests)
  resources/
    config/
      common.resource            ← Appium session bootstrap + shared vars from env
      capabilities.resource
    locators/
      login.locators.resource    ← Object Repository — *** Variables *** only
      shared-components.locators.resource
    keywords/
      login.page.resource        ← Page Object — imports locators, exposes business keywords
  libraries/
    VersionLocators.py           ← version-scoped locator resolver
  tests/
    user-login.robot             ← Test suite — calls page-object keywords only
robot.yaml                       ← repo root — run task (new mode)
requirements.txt                 ← repo root — robotframework, robotframework-appiumlibrary, Appium-Python-Client
```

**Report locations after `robot --outputdir results mobile-tests/tests`:**

```
results/output.xml    ← machine-readable results (consumed by heal-tests)
results/log.html      ← detailed step log
results/report.html   ← summary report
results/screenshots/  ← screenshots (on-failure or all)
```

---

## Prerequisites

### Tooling
- **Python 3.9+** with `robotframework`, `robotframework-appiumlibrary`, `Appium-Python-Client` (run `pwsh mobile/scripts/preflight-guardrails.ps1 -InstallDeps` to install).
- **Local target (`execution_target=local`):**
  - **Appium server 2.x** running and reachable at `appium_server_url` (default `http://127.0.0.1:4723`), with the `UiAutomator2` (Android) and/or `XCUITest` (iOS) driver installed.
  - **Android Studio** with an AVD (emulator) created — set `avd` (e.g. `Pixel_8_API_34`) to auto-launch it, or start it manually. Android SDK + `adb` on PATH.
  - iOS: Xcode + a booted simulator (real devices need signing).
  - The app installed on the device/emulator, or `app_path` pointing at an installable `.apk`/`.app`/`.ipa`.
- **BrowserStack target (`execution_target=browserstack`):**
  - A BrowserStack **App Automate** subscription.
  - `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` set.
  - The app uploaded to BrowserStack — supply the returned `bs://<hash>` as `browserstack.app_id`, or point `browserstack.app_path_upload` at a local `.apk`/`.ipa` to upload it via the [app-upload REST API](https://www.browserstack.com/app-automate/appium/getting-started/python/robot#upload-app).
  - A `browserstack.device` (e.g. `Google Pixel 8`) + `browserstack.os_version` (e.g. `14`).
  - No local Appium server or emulator is needed — the session runs entirely in the cloud.

### Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `EXECUTION_TARGET` | Recommended | `local` or `browserstack` |
| `APPIUM_SERVER_URL` | Local | Base URL of the running local Appium server |
| `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` | BrowserStack | BrowserStack App Automate credentials |
| `BROWSERSTACK_HUB_URL` / `BS_APP_ID` / `BS_DEVICE` / `BS_OS_VERSION` | BrowserStack | Hub URL, uploaded app id, device, OS version |
| `ADO_PAT` | Yes | Azure DevOps Personal Access Token |
| `ADO_ORG` | Yes | ADO organisation name (e.g., `everi`) |
| `ADO_PROJECT` | Yes | ADO project name (e.g., `Loyalty Kiosk`) |
| `MOBILE_PLATFORM` | Recommended | `android` or `ios` |
| `DEVICE_NAME` / `AVD` | Local | Target device / emulator name; Android Studio AVD to auto-launch |
| `PLATFORM_VERSION` | iOS recommended | OS version of the target device |
| `APP_PACKAGE` / `APP_ACTIVITY` | Android (local) | App package + launch activity |
| `BUNDLE_ID` | iOS (local) | App bundle identifier |
| `APP_PATH` | Optional | Path/URL to an installable app binary |
| `APP_USERNAME` / `APP_PASSWORD` | When `app_auth_strategy` is `env-var` | In-app login credentials |
| `APP_VERSION` | When `self_healing.heal_task` is `validate-version` | Semver of the app build under test |

Preflight writes these into `mobile/artifacts/.env` (gitignored) for local runs.

### Azure DevOps MCP server (PAT authentication)

This workflow authenticates to Azure DevOps using a **Personal Access Token** — no browser sign-in — via the Microsoft official [`@azure-devops/mcp`](https://github.com/microsoft/azure-devops-mcp) server launched through the shared PAT wrapper ([scripts/ado-mcp-launcher.ps1](scripts/ado-mcp-launcher.ps1)). Configure it in your VS Code `mcp.json` exactly as the UI/Test Cases workflows do (point the launcher at `.github/mobile/scripts/ado-mcp-launcher.ps1`, or reuse a single shared launcher). The PAT needs **Work Items: Read**, **Test Management: Read**, **Code: Read & Write**, and **Pull Request: Read & Write** scopes. Allowed/blocked tool names are enforced by [config/ado-operation-guardrails.json](config/ado-operation-guardrails.json).

> Verify with *"List ADO projects"* in Copilot Chat — it should return results **without** opening a browser.

---

## Configuration

Copy `config/workflow-input.example.json` to `config/workflow-input.current.json` and fill in your values. The `current.json` file is the live run input consumed by the agents.

### Key Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `platform` | `android` \| `ios` | Yes | — | Target mobile platform. Drives the default automation engine. |
| `execution_target` | `local` \| `browserstack` | Yes | `local` | Where the Appium session runs. `local` = local Appium + Android Studio emulator/device/iOS simulator. `browserstack` = BrowserStack App Automate cloud. |
| `appium_server_url` | string (URI) | Local | `http://127.0.0.1:4723` | URL of the local Appium server (ignored for BrowserStack). |
| `avd` | string | No | — | Android Studio AVD name to auto-launch (local + android). |
| `browserstack` | object | BrowserStack | — | BrowserStack settings: `username`/`access_key` (or env), `hub_url`, `app_id` (`bs://…`) or `app_path_upload`, `device`, `os_version`, `project_name`, `build_name`. |
| `device_name` | string | Local | — | Device / emulator / simulator name. |
| `platform_version` | string | iOS | — | OS version of the target device. |
| `automation_name` | string | No | `UiAutomator2` / `XCUITest` | Appium automation engine. |
| `app_package` / `app_activity` | string | Android (local, or `app_path`) | — | Android app package + launch activity. |
| `bundle_id` | string | iOS (local, or `app_path`) | — | iOS bundle identifier. |
| `app_path` | string | No | — | Path/URL to an installable app binary. |
| `app_version` | string | No | — | Semver of the build under test; drives version-scoped locators. |
| `app_auth_strategy` | `none` \| `env-var` | Yes | `none` | How the agent authenticates before analysing protected screens. |
| `test_output_path` | string | Yes | `mobile-tests` | Folder (under the project root) where RF files are written. Overridden by a detected existing layout (Step 0). |
| `report_output_path` | string | No | `results` | Robot Framework results folder; ignored when `robot_project_mode` is `existing`. |
| `robot_project_mode` | `new` \| `existing` | No | `new` | `new` generates `robot.yaml`/`requirements.txt`; `existing` skips them and conforms to the detected project. |
| `robot_config_path` | string \| null | When mode is `existing` | `null` | Relative path to `robot.yaml`/tests root inside `target_repo`. |
| `screenshot_mode` | `all` \| `on-failure` \| `none` | No | `on-failure` | When to capture screenshots. |
| `log_level` | `step` \| `action` \| `none` | No | `step` | `step` logs each test step; `action` also logs inside keywords. |
| `input_source` | `ado` \| `raw-file` | Yes | `ado` | Where test scenarios come from. |
| `raw_input_file` | string \| null | When `input_source` is `raw-file` | `null` | Local `.md`/`.txt`/`.json` — or a Test Cases workflow `.xlsx`/`.json` (auto-converted). |
| `user_story_ado_link` / `user_story_id` | — | When `input_source` is `ado` | — | ADO user story. |
| `test_cases_ado_link` / (`test_plan_id`+`test_suite_id`) | — | When `input_source` is `ado` | — | ADO test cases. |
| `reviewer_ado_user_id` | string | When `run_mode` is `execute` | — | PR reviewer (email or GUID). |
| `target_repo` | string | When `run_mode` is `execute` | — | ADO Git repository name. |
| `target_branch` | string | When `run_mode` is `execute` | `main` | Base branch. |
| `target_local_path` | string \| null | No | `null` | Optional override for the auto-derived project root. |
| `spec_name_override` | string \| null | No | `null` | Override the `.robot` suite file name (kebab-case). |
| `target_screens` | string[] | No | `[]` | Restrict analysis to specific screens/feature areas. |
| `run_mode` | `dry-run` \| `execute` | Yes | `dry-run` | `dry-run` generates artifacts only; `execute` creates branch, commits, opens PR. |
| `execution_confirmation` | `"APPROVED_EXECUTE"` \| null | When `run_mode` is `execute` | `null` | Must be `"APPROVED_EXECUTE"`. |
| `self_healing` | object \| null | No | `null` | Optional locator self-healing stage. |

Guard-rail constants — must always be exactly: `allow_ado_mutation=false`, `allow_probe_resources=false`, `ado_access_mode="read-only"`, `ado_tool_calls_mode="read-wrapper-only"`, `ado_write_tools_disabled=true`.

---

## Running

1. **Configure** — copy the example config and fill it in:
   ```powershell
   Copy-Item .github/mobile/config/workflow-input.example.json .github/mobile/config/workflow-input.current.json
   ```
2. **Preflight** (validates config + env, **checks tooling prerequisites**, writes `.env`, optionally installs deps):
   ```powershell
   # verify config, env, and that Python/Robot Framework/Appium/drivers are installed
   pwsh .github/mobile/scripts/preflight-guardrails.ps1

   # auto-install the Python packages, Appium, and the platform driver
   pwsh .github/mobile/scripts/preflight-guardrails.ps1 -InstallDeps

   # fail hard if any required tool is still missing (use in CI)
   pwsh .github/mobile/scripts/preflight-guardrails.ps1 -StrictPrereqs
   ```
   The prerequisite check verifies **Python 3.9+**, `robotframework`, `robotframework-appiumlibrary`, `Appium-Python-Client`, and — for the `local` target — **Node.js**, the **Appium CLI**, the platform driver (`uiautomator2`/`xcuitest`), and `adb`/Xcode. BrowserStack runs skip the local Appium/driver/adb checks.
3. **Prepare the execution target:**
   - **Local (Android Studio):** start the Appium server (`appium`), launch your AVD from Android Studio (or set `avd` to auto-launch), and confirm the device with `adb devices`. For iOS, boot a simulator in Xcode.
   - **BrowserStack:** upload the app (set `browserstack.app_id` to the returned `bs://<hash>`, or point `browserstack.app_path_upload` at a local binary) and pick `browserstack.device` + `browserstack.os_version`. No local Appium/emulator is needed.
4. **Run the orchestrator** — open `.github/mobile/agents/orchestrator.agent.md` in Copilot Chat and run it. Default `run_mode` is `dry-run` (no ADO writes).
5. **Execute the generated suite** (same command for both targets — `common.resource` picks the target from `${EXECUTION_TARGET}`):
   ```powershell
   robot --outputdir results mobile-tests/tests
   ```
6. **(Optional) Self-heal** — after a failing run, enable `self_healing` and point it at `results/output.xml`; the heal agent repairs locators and returns a re-run command.
7. **Open the PR** — set `run_mode` to `execute` with `execution_confirmation="APPROVED_EXECUTE"` and re-run the orchestrator.

---

## Guard Rails & Safety
- Default `dry-run`; ADO writes (branch + PR) happen only in `execute` mode with explicit confirmation.
- ADO access is **read-only** for work item / test case fetching; every ADO tool call is gated by `assert-ado-operation.ps1` against a fail-closed allow/block list.
- App analysis never submits forms, completes purchases/payments, or performs destructive actions.
- No credentials or PII are ever written into generated files, logs, tags, or screenshot names — all such values are read from environment variables via the config layer.
