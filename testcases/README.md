# Test Case Authoring Workflow

Generates **Positive / Negative / Boundary** test cases from an Azure DevOps user story and its evidence (acceptance criteria, SpecFlow/feature scenarios, attachments, local docs, wiki, repo specs). Delivers them as a formatted **Excel workbook** (default) and can optionally **publish** them into an ADO test plan/suite.

This is the upstream authoring counterpart to the `ui/` (Playwright) and `api/` (Postman) workflows, which *consume* test cases. It reuses the same PAT-based ADO MCP server (`ui/scripts/ado-mcp-launcher.ps1`).

---

## Start here

Use the orchestrator: [agents/orchestrator.agent.md](agents/orchestrator.agent.md).

### Agent order
1. [agents/author-testcases-from-ado.agent.md](agents/author-testcases-from-ado.agent.md) — intake (read-only) + generate + write review artifact
2. Excel export (via `excel-exporter` skill) — when `output_mode` is `excel` or `both`
3. [agents/publish-testcases-to-ado.agent.md](agents/publish-testcases-to-ado.agent.md) — **execute mode only**, when `output_mode` is `ado` or `both`

### Skills
- [skills/ado-story-intake/SKILL.md](skills/ado-story-intake/SKILL.md) — mandatory story intake (details, relations, comments, attachments, child items, local docs, specs → intake summary)
- [skills/testcase-generator/SKILL.md](skills/testcase-generator/SKILL.md) — ISTQB-grounded generation (formal techniques, test levels, functional + NFR categories), canonical 22-column rows, RTM + coverage/risk summaries, SpecFlow alignment
- [skills/excel-exporter/SKILL.md](skills/excel-exporter/SKILL.md) — ImportExcel formatting, AppLocker-safe inline execution

---

## Flow

```mermaid
flowchart TD
  A[preflight: env + PAT MCP] --> B[@testcase-orchestrator]
  B --> C[author-testcases-from-ado]
  C --> D{story_source}
  D -->|ado| E[ado-story-intake<br/>read story + AC + specs + attachments]
  D -->|raw-file| E2[ado-story-intake<br/>parse raw_input_file / input.txt]
  E --> U{ui_exploration.enabled?}
  E2 --> U
  U -->|true| UX[Playwright MCP<br/>navigate app + observe UI read-only]
  U -->|false| M{mobile_exploration.enabled?}
  UX --> M
  M -->|true| MX[Appium session<br/>read page_source + observe screens read-only]
  M -->|false| F
  MX --> F[testcase-generator<br/>Positive / Negative / Boundary, 11-col rows]
  F --> G[review artifact<br/>artifacts/testcase-review-&lt;id&gt;.md]
  G --> H{output_mode}
  H -->|excel / both| I[excel-exporter → .xlsx]
  H -->|ado / both + execute + APPROVED_EXECUTE| J[publish-testcases-to-ado]
  J --> K[create suite if needed → create cases → add to suite → verify]
```

> **Raw-file source.** Set `story_source: raw-file` and `raw_input_file` to a local file (a starter [input.txt](input.txt) is provided) to generate test cases from pasted acceptance criteria / Gherkin scenarios with no ADO story lookup. Publishing to ADO (`output_mode: ado`) still works from a raw-file source as long as `ado_org_url`, `ado_project`, and `ado_publish.target_test_plan_id` are set.

> **Live UI exploration (optional).** Set `ui_exploration.enabled: true` to have intake navigate the *running* app with Playwright MCP, observe the actual UI functionality (screens, controls, flows, validation, states) **read-only**, and fold those observations into the requirements before generation — so cases reflect what the UI really does, not only the written story. The URL comes from `ui_exploration.app_url` (or the first `http(s)` URL found in `input.txt`). Choose an auth strategy via `ui_exploration.app_auth_strategy` (`none` → public screens; `env-var` → log in with `APP_USERNAME` / `APP_PASSWORD`; `cookie-file` → reuse a saved storage state). Works alongside any `story_source` — the typical combo is a raw `input.txt` story **plus** a live app URL. The exploration never submits forms or mutates application state. Before it runs, the orchestrator invokes `scripts/preflight-exploration.ps1`, which checks for Playwright and installs it (Node.js + Playwright CLI + Chromium) if missing.

> **Live mobile-app exploration (optional).** Set `mobile_exploration.enabled: true` to do the same for a **mobile** app via an Appium session (the mobile counterpart of `ui_exploration`). Intake starts a `local` (emulator/AVD or device) or `browserstack` session, reads the Appium `page_source` / accessibility hierarchy of each screen **read-only**, and folds the observed screens/controls/flows/validation into the requirements. Set `platform` (`android`/`ios`), `execution_target`, the app identity (`app_package` + `app_activity`, `bundle_id`, or `app_path`; `browserstack.app_id` for the cloud), and `app_auth_strategy` (`none` or `env-var`). Web and mobile exploration are independent — enable whichever matches the app under test. The exploration never submits forms, completes purchases, or mutates application state. Before it runs, the orchestrator invokes `scripts/preflight-exploration.ps1`, which checks for Appium and installs the tooling (Python + Appium-Python-Client + selenium, plus the local Appium CLI/driver and `adb`/`xcrun`) if missing.

---

## Two-phase authoring (Phase 2 optional)

| | Phase 1 — `authoring_phase: development` | Phase 2 — `authoring_phase: enhancement` |
|---|---|---|
| **When** | Initial authoring — story in development, or already deployed | Baseline was authored pre-deployment and the build is now deployed to our instance |
| **Evidence** | Story, ACs, specs, attachments, docs, wiki (+ live app when exploration enabled) | Phase 1 baseline + story + live app |
| **Exploration** | Optional — off while in development; on when already deployed (single-pass) | `ui_exploration` and/or `mobile_exploration` must be enabled |
| **Generation** | Full ISTQB set from scratch (baseline) | Reconcile baseline: `Unchanged` / `Updated` / `New` / `Obsolete-Candidate` |
| **Files** | `artifacts/testcases-<id>.json`, `testcase-review-<id>.md`, `<basename>.xlsx`, `publish-receipt-<id>.json` (if published) | `artifacts/testcases-<id>.enhanced.json`, `testcase-review-<id>.enhanced.md`, **same `<basename>.xlsx` updated in place** (+ `<basename>_backup_<timestamp>.xlsx`) |
| **ADO publish** | Optional — create cases in suite | **None** — `output_mode` must be `excel`; import the updated workbook into ADO manually if needed |

- **Single-pass:** if development is already complete and the story is deployed, run only `development` with exploration enabled — skip Phase 2.
- Phase 2 keeps every baseline `test_case_id`; `validate-testcases.ps1 -BaselinePath` fails if a baseline case is dropped.
- If the live UI contradicts an AC, the AC-based expected result is kept and the mismatch goes to **Discrepancies** (potential defect).
- In the updated workbook, title rows are tinted by change type (Updated = yellow, New = green, Obsolete-Candidate = grey), and `Enhancement Changes` / `Discrepancies` sheets are added.

```jsonc
// Phase 2 config delta
"authoring_phase": "enhancement",
"output_mode": "excel",
"enhancement": { "baseline_cases_path": null, "baseline_workbook_path": null, "environment_label": "QA2 - build 2026.09.27.3" },
"ui_exploration": { "enabled": true, "app_url": "https://<our-instance>", "app_auth_strategy": "env-var" }
```

---

## Inputs

All inputs live in `config/workflow-input.current.json` (copy from [config/workflow-input.example.json](config/workflow-input.example.json)); the JSON Schema is [config/workflow-schema.json](config/workflow-schema.json).

| Field | Required | Purpose |
|---|---|---|
| `authoring_phase` | No (default `development`) | `development` (Phase 1 baseline; exploration optional — enable when already deployed for single-pass) \| `enhancement` (optional Phase 2, reconcile baseline with live UI) |
| `enhancement.baseline_cases_path` / `baseline_workbook_path` / `environment_label` | Phase 2 | Baseline JSON to reconcile (default `artifacts/testcases-<id>.json`), Phase 1 workbook to update in place (default `<excel dir>/<basename>.xlsx`), and where the build was explored |
| `story_source` | Yes | `ado` (read a user story from ADO) \| `raw-file` (read from a local file) |
| `raw_input_file` | When `raw-file` | Path to `.md`/`.txt`/`.json` (e.g. `.github/testcases/input.txt`) |
| `ado_org_url`, `ado_project` | When `ado` source or `ado` output | ADO org URL + project |
| `user_story_id` **or** `user_story_title_keywords` | When `story_source` is `ado` | Resolve the story |
| `source_repo_url` / `source_spec_root_path` / `source_feature_files` | No | SpecFlow/feature alignment |
| `source_wiki_url` | No | Wiki page evidence |
| `source_local_doc_paths` / `source_local_doc_types` | No | Local docx/pdf/xlsx/md/txt evidence |
| `ui_exploration.enabled` | No | When `true`, navigate the running app with Playwright MCP and fold live UI observations into intake (read-only) |
| `ui_exploration.app_url` | When UI exploration enabled and no URL in `input.txt` | Base URL of the running app to explore |
| `ui_exploration.app_auth_strategy` | No | `none` \| `env-var` (uses `APP_USERNAME` / `APP_PASSWORD`) \| `cookie-file` |
| `ui_exploration.target_paths` / `ui_exploration.max_pages` | No | Focus areas and a soft cap on screens visited |
| `mobile_exploration.enabled` | No | When `true`, drive the running mobile app via an Appium session and fold live screen observations into intake (read-only) |
| `mobile_exploration.platform` / `execution_target` | When mobile exploration enabled | `android`\|`ios`; `local`\|`browserstack` |
| `mobile_exploration.app_package`+`app_activity` / `bundle_id` / `app_path` | When mobile exploration enabled (local) | App identity for the Appium session |
| `mobile_exploration.browserstack` | When `execution_target` is `browserstack` | `device`, `os_version`, `app_id`, `hub_url` |
| `mobile_exploration.app_auth_strategy` | No | `none` \| `env-var` (uses `APP_USERNAME` / `APP_PASSWORD`) |
| `mobile_exploration.target_screens` / `mobile_exploration.max_screens` | No | Focus areas and a soft cap on screens visited |
| `title_prefix` | No | Title template; trailing `<scenario>` replaced per case |
| `work_item_type`, `default_state`, `area_path`, `iteration_path`, `assigned_to` | No | Test-case metadata |
| `header_validation` | No | Append `AND verify response header: <name> = <value>` when a scenario asserts headers |
| `output_mode` | Yes | `excel` (default) \| `ado` \| `both` |
| `excel.*` | When Excel | Worksheet, output dirs, file basename |
| `ado_publish.target_test_plan_id` / `target_test_suite_id` | When `ado` | Publish destination |
| `run_mode` | Yes | `dry-run` (default) \| `execute` |
| `execution_confirmation` | For ADO writes | Must equal `APPROVED_EXECUTE` |

---

## Canonical test-case shape

**22 columns (exact order):** Work Item Type, Test Case ID, Requirement ID, Test Condition, Scenario, Title, Type, Test Level, Technique, Category, Priority, Severity, Risk Rating, Automation Feasibility, State, Area Path, Assigned To, Preconditions, Test Step, Step Action, Expected Result, Test Data.

> Columns 2–14 carry the ISTQB analysis (formal technique, test level, category, priority/severity/risk, automation feasibility, traceability). ADO test-case import maps the known fields (Title, Test Step, Step Action, Expected Result, Priority, State, Area Path, Assigned To); the remaining ISTQB columns are preserved in the Excel review artifact and ignored on ADO import.

**Row pattern per test case:**
- **Title row** — TC-level columns (1–18) filled; Test Step / Step Action / Expected Result blank.
- **Step rows 1..N-1** — only Test Step + Step Action.
- **Last step row N** — Test Step + Step Action + Expected Result.

**ISTQB deliverables (also emitted):** a Requirements Traceability Matrix, coverage summary (by Type / Level / Category / Technique / requirement), risk coverage summary, missing & ambiguous requirements, and exploratory test ideas — written into the review artifact and as `Traceability` / `Coverage` / `Risk` / `Gaps & Ideas` worksheets.

**SpecFlow alignment:** one test case per `Examples` row (1:1); `Given` → Preconditions; each `When` → Step Action; final `Then` → last-step Expected Result; exact data fidelity from `Examples`.

---

## Running it

### 0 — Environment / MCP
Uses the shared PAT ADO MCP server (see [ui/README.md](../ui/README.md) → *Azure DevOps MCP server (PAT authentication)*). Enter the PAT once; scopes: **Work Items: Read**, **Test Management: Read & Write** (only needed for `output_mode: ado`), **Wiki/Code: Read** (for spec/wiki evidence).

```powershell
$env:ADO_ORG = "everi"; $env:ADO_PROJECT = "PAAS"
```

> When `ui_exploration.app_auth_strategy` is `env-var`, also set `APP_USERNAME` / `APP_PASSWORD` so the exploration can log in before visiting protected screens.

> When `mobile_exploration.enabled` is `true`, also set the Appium/app env (`APPIUM_SERVER_URL`, `APP_PACKAGE`/`APP_ACTIVITY`/`BUNDLE_ID`/`APP_PATH` for local, or `BROWSERSTACK_USERNAME`/`BROWSERSTACK_ACCESS_KEY` for BrowserStack), plus `APP_USERNAME` / `APP_PASSWORD` when its `app_auth_strategy` is `env-var`.

### 1 — Configure
Edit `config/workflow-input.current.json` for your story.

### 2 — Invoke
```
@testcase-orchestrator
```

### 3 — Review, then publish (optional)
- `dry-run` produces `artifacts/testcase-review-<id>.md` and (when requested) the `.xlsx`.
- To publish to ADO, set `output_mode: ado` (or `both`), `run_mode: execute`, `execution_confirmation: APPROVED_EXECUTE`, and `ado_publish.target_test_plan_id`, then re-invoke.

---

## Deterministic validation (offloaded from the LLM)

To keep token/credit usage down, deterministic checks run as PowerShell scripts instead of LLM reasoning:

| Script | Replaces LLM work |
|---|---|
| [scripts/validate-config.ps1](scripts/validate-config.ps1) | Required fields, enums, conditional requirements (`story_source`/`output_mode`/`run_mode`, ADO-vs-raw-file, publish gating) validated against the schema |
| [scripts/preflight-exploration.ps1](scripts/preflight-exploration.ps1) | Verifying/installing the live-exploration tooling when `ui_exploration`/`mobile_exploration` is enabled: Playwright (Node + CLI + Chromium) for web, Appium (Python + Appium-Python-Client + selenium, plus local Appium CLI/driver/`adb`/`xcrun`) for mobile. No-ops when neither pass is enabled |
| [scripts/parse-ado-refs.ps1](scripts/parse-ado-refs.ps1) | Extracting org / project / work-item ID / plan ID / suite ID from ADO URLs |
| [scripts/validate-testcases.ps1](scripts/validate-testcases.ps1) | Canonical 22-column / row-pattern structural check plus ISTQB metadata validation (mandatory fields, enums for level/technique/category/severity/risk/automation, priority 1-4, one Expected Result on the last step, valid Type, no `<scenario>` placeholder, step cap, RTM presence). Phase 2: `change_type`/`change_summary` enforcement and, with `-BaselinePath`, no dropped or reused baseline IDs |
| [scripts/assert-ado-operation.ps1](scripts/assert-ado-operation.ps1) | Per-call ADO operation gating |

The LLM is reserved for semantic work only: understanding acceptance criteria, generating Positive/Negative/Boundary cases and steps, SpecFlow mapping, and coverage judgment.

## Safety model

- **Dry-run by default** — no ADO writes; Excel + review artifact only.
- **ADO writes are execute-gated** — test-case publishing requires `run_mode: execute` **and** `APPROVED_EXECUTE`, and is limited to ADO **test-plan test-case** operations by [config/ado-operation-guardrails.json](config/ado-operation-guardrails.json) (enforced per call by [scripts/assert-ado-operation.ps1](scripts/assert-ado-operation.ps1), fail-closed).
- **Never** creates/updates the source work item, comments, relations, PRs, or wiki.
- **One story = one package.** No mixed-story batches.
- **No fabricated data** — every value traces to intake evidence.
- **AppLocker-safe** — Excel is written with inline PowerShell; no `.ps1`/`.py` files are created.

---

## What was adapted from the existing prompt template

Brought forward from the team's reusable prompt: the mandatory 8-step story intake, the exact canonical column layout and row pattern, SpecFlow 1:1 `Examples` mapping with data fidelity, the response-header verification rule, the ImportExcel formatting rules (header/title styling, freeze pane, wrap, auto-size), the AppLocker-safe inline execution rule, and the required output summaries. Added on top: the full **ISTQB Advanced Test Analyst** design set (formal techniques, test levels, functional + non-functional categories, per-case risk/severity/priority/automation-feasibility, RTM + coverage/risk summaries, missing/ambiguous requirements, exploratory ideas), guardrailed **direct ADO test-plan publishing** (execute-gated), and a persisted Human-review artifact.
