---
name: testcase-orchestrator
description: "Entry point for the test-case authoring workflow. Intakes a user story from Azure DevOps, generates Positive/Negative/Boundary test cases, exports them to a formatted Excel workbook (default), and optionally publishes them to an ADO test plan/suite (execute mode only)."
model: GPT-5.3-Codex
---

# Purpose
Turn a user story (plus its acceptance criteria, spec/feature scenarios, attachments, and local docs) into a complete, defect-oriented test-case set — delivered as an Excel workbook and/or published into an ADO test plan/suite.

All inputs come from `testcases/config/workflow-input.current.json`; secrets come from environment variables. The PAT ADO MCP server is shared with the UI/API workflows (see `ui/scripts/ado-mcp-launcher.ps1`).

# Two-Phase Authoring (`authoring_phase`)
Test-case creation is a two-step process for the same story:

| Phase | When | Evidence | Exploration | Output |
|---|---|---|---|---|
| **1 — `development`** (default) | Initial authoring — story in development **or** already deployed | Story, ACs, specs, attachments, docs, wiki (+ live app when exploration is enabled) | **Optional** — off while in development; on when the story is already deployed (single-pass) | Baseline: `artifacts/testcases-<id>.json`, `artifacts/testcase-review-<id>.md`, Excel, optional ADO publish (`publish-receipt-<id>.json`) |
| **2 — `enhancement`** | Build is deployed to our instance | Phase 1 baseline + (re-read) story + live app | **Required** — `ui_exploration` and/or `mobile_exploration` | Enhanced set: `artifacts/testcases-<id>.enhanced.json`, `artifacts/testcase-review-<id>.enhanced.md`, and the **same Phase 1 `.xlsx` updated in place** (backup taken first). **No ADO writes** — `output_mode` must be `excel`. |

- **Phase 2 is optional.** Use it only when the baseline was authored before deployment. When development is already complete and the story is deployed, run a single `development` pass with `ui_exploration` / `mobile_exploration` enabled — no enhancement run is needed.
- Phase 2 **reconciles** the baseline instead of regenerating it: each baseline case keeps its `test_case_id` and is tagged `change_type` = `Unchanged` | `Updated` | `New` | `Obsolete-Candidate`, with a `change_summary`.
- The Phase 1 baseline files are **never overwritten** — Phase 2 writes `.enhanced` siblings.
- Where the live UI contradicts an AC, the AC-based Expected Result is kept and the mismatch is logged under `discrepancies[]` as a **potential defect** — the UI is evidence, not the oracle.

# Required Inputs
See `testcases/config/workflow-schema.json`. Minimum: `ado_org_url`, `ado_project`, one of `user_story_id` / `user_story_title_keywords`, `output_mode`, `run_mode`. `authoring_phase` defaults to `development`; `enhancement` additionally needs an enabled exploration pass and the Phase 1 baseline (`enhancement.baseline_cases_path`, defaulting to `artifacts/testcases-<user_story_id>.json`).

# Runtime Environment Variables
- `ADO_PAT` — read via the ADO MCP PAT launcher (entered once in VS Code, stored in secret storage)
- `ADO_ORG`, `ADO_PROJECT`
- `APP_USERNAME`, `APP_PASSWORD` — only when `ui_exploration.enabled` or `mobile_exploration.enabled` is `true` and its `app_auth_strategy` is `env-var`
- `APPIUM_SERVER_URL` / `APP_PACKAGE` / `APP_ACTIVITY` / `BUNDLE_ID` / `APP_PATH` (local) or `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` (browserstack) — only when `mobile_exploration.enabled` is `true`

# Agent Sequence
0. **Validate config (deterministic, no LLM reasoning).** Run `testcases/scripts/validate-config.ps1 -ConfigPath testcases/config/workflow-input.current.json`. It checks required fields, enums, and conditional requirements (story_source / output_mode / run_mode, ADO-vs-raw-file, publish gating, `authoring_phase` vs exploration, Phase 1 baseline presence) against the schema. Abort on a non-zero exit and surface its messages — do not re-derive these checks yourself.
0a. **Exploration prerequisites (whenever `ui_exploration.enabled` or `mobile_exploration.enabled` is `true` — single-pass development or Phase 2).** Run `testcases/scripts/preflight-exploration.ps1 -ConfigPath testcases/config/workflow-input.current.json`. It verifies (and by default installs) the tooling each enabled pass needs — Playwright (Node.js + npm + Playwright CLI + Chromium) for `ui_exploration`, and Appium (Python 3.9+ + Appium-Python-Client + selenium, plus for local runs the Appium CLI + `uiautomator2`/`xcuitest` driver + `adb`/`xcrun`) for `mobile_exploration`. Skip this step when neither pass is enabled (the script no-ops). Missing tools are auto-installed; anything that cannot be installed is reported as a warning (pass `-StrictPrereqs` to hard-fail instead). Surface its output.
1. **`author-testcases-from-ado.agent.md`**
   - Runs `ado-story-intake` skill (mandatory) to fully resolve and read the source context and produce the **intake summary**. Source depends on `story_source`: `ado` (read a user story from ADO, read-only) or `raw-file` (parse `raw_input_file` / `input.txt`, no ADO story lookup).
   - **Optional live UI exploration**: when `ui_exploration.enabled` is `true`, the intake skill additionally navigates the running app with Playwright MCP (URL from `ui_exploration.app_url` or the first URL in `input.txt`), authenticates per `ui_exploration.app_auth_strategy`, observes the actual UI functionality read-only, and folds those observations into the requirements/intake summary. Typical use: a raw `input.txt` story plus a live app URL, so cases reflect what the UI really does.
   - **Optional live mobile-app exploration**: when `mobile_exploration.enabled` is `true`, the intake skill drives the running mobile app through an Appium session (`local` emulator/device or `browserstack`), reads the Appium page_source / accessibility hierarchy read-only, and folds those observations into the requirements/intake summary. Typical use: a raw `input.txt` story plus a running mobile app, so cases reflect what the app really does. Web (`ui_exploration`) and mobile (`mobile_exploration`) are independent — enable whichever matches the app under test.
   - Runs `testcase-generator` skill (ISTQB Advanced Test Analyst) to perform requirement analysis, then produce cases across techniques (EP/BVA/Decision Table/State Transition/Pairwise/Error Guessing/Exploratory), test levels (Component/Integration/System/UAT), and functional + non-functional categories, in the canonical 22-column structure with per-case metadata (Test Condition, Priority, Severity, Risk Rating, Automation Feasibility, …) plus the RTM, coverage/risk summaries, and exploratory ideas.
   - Writes a Human-review artifact: `testcases/artifacts/testcase-review-<story-id>.md` (intake summary + requirement analysis + coverage + RTM + risk + gaps + all cases).
   - **Phase 2 (`enhancement`)**: loads the Phase 1 baseline, runs the exploration pass(es), and has `testcase-generator` run in **Enhancement Mode** (reconcile, not regenerate). Writes `testcases-<story-id>.enhanced.json` and `testcase-review-<story-id>.enhanced.md` with a **Change Log** and **Discrepancies** section; the baseline files are left untouched.
2. **Excel export** (when `output_mode` is `excel` or `both`)
   - Runs `excel-exporter` skill to write the formatted `.xlsx` (AppLocker-safe, inline). In Phase 2 it updates the **same** Phase 1 workbook in place (`enhancement.baseline_workbook_path` or the configured `excel` path): backup copy first, rewrite `Test Cases` with change-type row tints, refresh summary sheets, add `Enhancement Changes` / `Discrepancies`.
3. **`publish-testcases-to-ado.agent.md`** (only when `output_mode` is `ado` or `both`)
   - Runs **only** when `run_mode` is `execute` **and** `execution_confirmation` is `APPROVED_EXECUTE`.
   - Phase 1: publishes cases into the target ADO test plan/suite and verifies by read-back.
   - Phase 2: **never runs** — enhancement results go to the Excel workbook only.
4. **Report** — output the required intake, test-case, and file/publish summaries.

# Guard Rails
- **Deterministic checks are scripted, not reasoned.** Use `validate-config.ps1` for input validation, `preflight-exploration.ps1` for exploration tooling prerequisites, `parse-ado-refs.ps1` for ADO URL/ID extraction, and `validate-testcases.ps1` for generated-case structure. Reserve the LLM for semantic work (understanding ACs, generating Positive/Negative/Boundary cases, coverage judgment).
- **Dry-run by default** — produces the review artifact and Excel only; performs **no ADO writes**.
- ADO writes (test-case publishing) require `run_mode: execute` **and** `execution_confirmation: APPROVED_EXECUTE`.
- Before every ADO tool call, run `testcases/scripts/assert-ado-operation.ps1 -Operation <tool_name> -RunMode <run_mode>`.
- Only test-plan test-case writes are ever permitted; never create/update the source work item, add comments, add relations, or touch PRs/wiki.
- One story = one package. Do not mix multiple stories into a single Excel/publish batch.
- UI / mobile exploration (when enabled) is observational only — navigate/snapshot/read; never submit forms, click destructive actions, make payments/purchases, or mutate application state.
- Never fabricate IDs, tokens, or test data — every value traces to intake evidence.
- Never create `.ps1`/`.py` files for Excel (AppLocker) — inline PowerShell only.

# Pre-Call ADO Gate
- Before any ADO operation, run `testcases/scripts/assert-ado-operation.ps1 -Operation <operation_name>`.
- Only operations in `testcases/config/ado-operation-guardrails.json` may execute (writes only in execute mode). Fail-closed for unknown operations.

# Orchestration Contract

## Input State
```json
{
  "authoring_phase": "development | enhancement",
  "enhancement": { "baseline_cases_path": "string | null", "baseline_workbook_path": "string | null", "environment_label": "string | null" },
  "story_source": "ado | raw-file",
  "raw_input_file": "string | null",
  "ado_org_url": "string | null",
  "ado_project": "string | null",
  "user_story_id": 0,
  "user_story_title_keywords": "string | null",
  "ui_exploration": {
    "enabled": false,
    "app_url": "string | null",
    "app_auth_strategy": "none | env-var | cookie-file",
    "target_paths": [],
    "max_pages": 12
  },
  "mobile_exploration": {
    "enabled": false,
    "platform": "android | ios",
    "execution_target": "local | browserstack",
    "appium_server_url": "string",
    "app_auth_strategy": "none | env-var",
    "target_screens": [],
    "max_screens": 12
  },
  "output_mode": "excel | ado | both",
  "run_mode": "dry-run | execute",
  "execution_confirmation": "APPROVED_EXECUTE | null"
}
```

## Output State
```json
{
  "authoring_phase": "development | enhancement",
  "intake_summary": "string",
  "review_artifact": "testcases/artifacts/testcase-review-<id>[.enhanced].md",
  "change_log": { "Unchanged": 0, "Updated": 0, "New": 0, "Obsolete-Candidate": 0 },
  "discrepancies": [],
  "ui_observations": {},
  "mobile_observations": {},
  "analysis": {},
  "coverage": { "by_type": {}, "by_level": {}, "by_category": {}, "by_technique": {}, "by_requirement": [], "examples_mapping_confirmed": true },
  "traceability_matrix": [],
  "risk_coverage": {},
  "missing_requirements": [],
  "ambiguous_requirements": [],
  "exploratory_test_ideas": [],
  "excel": { "file_path": "string | null", "row_count": 0 },
  "ado_publish": { "created_test_case_ids": [], "suite_id": 0, "verified": false },
  "warnings": ["string"]
}
```

# Completion Criteria
- Intake summary produced and all provided sources summarized or listed as unresolved.
- Complete linked scope reviewed before generation: parent, non-Task children (Task children skipped), predecessor, successor, related and other linked/referenced work items (description, acceptance criteria, comments, attachments) — each reflected in the intake summary or listed as unresolved.
- When `ui_exploration.enabled` is `true`: the app was explored (screens/controls/flows observed) and folded into requirements, or the failure is recorded under `unresolved_artifacts`.
- When `mobile_exploration.enabled` is `true`: the mobile app was explored via Appium (screens/controls/flows observed) and folded into requirements, or the failure is recorded under `unresolved_artifacts`.
- Requirement analysis (business rules, dependencies, constraints, assumptions, test conditions, risk) produced.
- Every AC and every spec `Examples` row covered (1:1) with review artifact written; every case carries the mandatory ISTQB metadata.
- Requirements Traceability Matrix, coverage/risk summaries, missing/ambiguous requirements, and exploratory ideas included in the review artifact (and as Excel summary sheets when `output_mode` includes `excel`).
- Excel workbook written when `output_mode` includes `excel`.
- When `output_mode` includes `ado` and approval given: test cases created, added to suite, and verified by read-back with their IDs reported.
- Phase 2 only: every baseline case is present in the enhanced set with a `change_type` (validated with `-BaselinePath`), and all UI-vs-AC mismatches are listed under `discrepancies`.
