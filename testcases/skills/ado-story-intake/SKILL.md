---
name: ado-story-intake
description: "Use to resolve and fully read a user story's context from Azure DevOps (details, relations, comments, revisions, attachments, child items) plus optional local documents, wiki, and repo spec/feature files, before any test-case generation. Also supports a raw-file source (input.txt) that bypasses the ADO story lookup, an optional live web-UI exploration pass (Playwright MCP), and an optional live mobile-app exploration pass (Appium). Produces a required intake summary."
---

# Goal
Establish complete, evidence-grounded context **before** any test case is generated. No test cases may be produced until intake is complete and an intake summary exists.

Two source modes, selected by `story_source`:
- **`ado`** — resolve and read a user story from Azure DevOps (Branch A).
- **`raw-file`** — read requirements/scenarios from a local file such as `input.txt`, with **no ADO story lookup** (Branch B).

Two optional live-exploration passes run on top of either branch and fold their observations into the same intake summary as additional evidence:
- **Section U — web UI exploration** (when `ui_exploration.enabled` is `true`): navigates the running web app with Playwright MCP.
- **Section M — mobile-app exploration** (when `mobile_exploration.enabled` is `true`): drives the running mobile app through an Appium session (local emulator/device or BrowserStack).

> **Read-only.** In `ado` mode every ADO call is a read; before each one run `testcases/scripts/assert-ado-operation.ps1 -Operation <tool_name>`. In `raw-file` mode no ADO reads are needed for intake. Both exploration passes are strictly observational — they never submit forms, complete purchases, click destructive actions, or mutate application state. Never treat an outage or unreadable artifact as evidence of absence — record it as unresolved.

# Inputs
- `story_source` — `ado` (default) or `raw-file`
- **Branch A (`ado`)**: `ado_org_url`, `ado_project`, `user_story_id` **or** `user_story_title_keywords`
- **Branch B (`raw-file`)**: `raw_input_file` (path to `.md` / `.txt` / `.json`)
- Optional sources (both branches): `source_repo_url`, `source_wiki_url`, `source_spec_root_path`, `source_feature_files[]`, `source_local_doc_paths[]`, `source_local_doc_types[]`
- **UI exploration (optional, both branches)**: `ui_exploration.enabled`, `ui_exploration.app_url`, `ui_exploration.app_auth_strategy`, `ui_exploration.target_paths[]`, `ui_exploration.max_pages`
  - Environment (only when `app_auth_strategy` is `env-var`): `APP_USERNAME`, `APP_PASSWORD`
- **Mobile exploration (optional, both branches)**: `mobile_exploration.enabled`, `mobile_exploration.platform`, `mobile_exploration.execution_target`, `mobile_exploration.appium_server_url`, `mobile_exploration.app_auth_strategy`, `mobile_exploration.app_package` / `app_activity` / `bundle_id` / `app_path` / `avd`, `mobile_exploration.browserstack`, `mobile_exploration.target_screens[]`, `mobile_exploration.max_screens`
  - Environment: `APPIUM_SERVER_URL` / `APP_PACKAGE` / `APP_ACTIVITY` / `BUNDLE_ID` / `APP_PATH` (local), `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` (browserstack), `APP_USERNAME` / `APP_PASSWORD` (only when `app_auth_strategy` is `env-var`)

# Branch B — raw-file intake (when `story_source` is `raw-file`)
1. Verify `raw_input_file` is set and readable; abort with a clear error if not.
2. Parse the file by extension:
   - **`.json`** — a pre-structured payload; accept `story_title`, `requirements[]`, and/or `spec_scenarios[]` directly after light validation.
   - **`.md` / `.txt`** — extract:
     - `story_title` from the first `# `/`Story:`/`Story Title:` line.
     - Acceptance criteria from an `Acceptance Criteria:` / `AC:` block or `##`/numbered/bulleted lists → one `requirements[]` entry each, `source: "Raw file: <filename>"`.
     - Gherkin `Scenario` / `Scenario Outline` + `Examples` tables → `spec_scenarios[]` (capture Examples rows verbatim for 1:1 mapping).
     - A `Notes / Test Data:` block → carried as constraints/test data.
3. Also read any provided optional sources (feature files, local docs, wiki, repo specs) exactly as in Branch A steps 6 and 8, since these are source-agnostic.
4. Build the same **intake summary** (step 9), using the file name as the source and `ADHOC`/`raw-file` in place of a story ID when none is present.
Then skip Branch A and go to Outputs.

# Procedure — Branch A (`ado`)
Do all before generation.

## 1 — Resolve the User Story ID
- If `user_story_id` is provided, use it directly.
- Otherwise, search by `user_story_title_keywords` in `ado_project` via `mcp_ado_search_workitem` (or `mcp_ado_wit_query_by_wiql`) and select the best title/state match. If several plausible matches exist, list them and ask the Human to confirm; do not guess silently.

## 2 — Read full story details
Fetch via `mcp_ado_wit_get_work_item` (expand relations + fields):
- Title, description, **acceptance criteria**, state, assignee, area path, iteration path.
- Custom rich-text fields that carry scope (e.g. `Custom.DevelopmentRefinement`, `Custom.DocumentationLinks`) — read them even when empty-looking.
- All linked URLs embedded in the description HTML (including wiki links) and any test-instance/environment URLs.
- `expand=all` truncates long HTML fields (~2000 chars). If a field appears cut off (`[truncated]`), re-fetch it with `fields=[<field ref name>]` and read the full value.

## 3 — Read relations (complete linked scope — mandatory)
Inventory **every** relation on the story and group it by link type. Every linked work item must be reviewed — none may be skipped silently:
- **Parent** (`System.LinkTypes.Hierarchy-Reverse`) — feature/epic scope, target customers, cross-story rules.
- **Child** (`System.LinkTypes.Hierarchy-Forward`) — bugs/spikes/sub-stories and other non-Task children. **Children whose `System.WorkItemType` is `Task` are skipped** (dev/QA effort tracking, no scope): after the batch load identifies their type, list them as `skipped (Task)` in the intake summary and do **not** read their description, comments or attachments or add them to `linked_items[]`.
- **Predecessor** (`System.LinkTypes.Dependency-Reverse`) — upstream work this story depends on.
- **Successor** (`System.LinkTypes.Dependency-Forward`) — downstream work (callers/consumers) that depends on this story.
- **Related** (`System.LinkTypes.Related`) — sibling/consolidated stories and analysis tasks.
- **Duplicate / Duplicate Of**, **Tested By / Tests**, and any other work-item link type present.
- **Artifact** links (PRs, builds, commits, branches, release environments) — note for optional evidence.
- Work items **referenced by ID in the story description/AC** (e.g. "User Story 1365562") — treat as dependencies and review them too.

For every linked work item, batch-load with `mcp_ado_wit_get_work_items_batch_by_ids` (one call for uncached IDs; do not re-fetch) requesting at least: `System.Id`, `System.Title`, `System.WorkItemType`, `System.State`, `System.Description`, `Microsoft.VSTS.Common.AcceptanceCriteria`, `Custom.DevelopmentRefinement`. Re-fetch any truncated field individually. For each item record: link type, title, type, state, and the **testable constraints / scope boundaries / dependencies** it adds to this story (or `no additional constraints`). Items in `Removed` state are still read — note that their scope may have moved to another item.

## 4 — Read comments and revisions
- `mcp_ado_wit_list_work_item_comments` for the primary story — read every comment and inventory any linked assets (embedded images, wiki/doc links, work-item references).
- `mcp_ado_wit_list_work_item_comments` for every **directly linked work item** from step 3 (parent, non-Task children, predecessor, successor, related) — capture clarifications, decisions, QA observations and defects that affect this story's scope.
- Include major revision deltas only when they change scope (added/removed AC).

## 5 — Read attachments
- Extract attachment IDs from: the story's `AttachedFile` relations, description/AC HTML, **comment HTML (embedded images)**, and the same three sources on every directly linked work item (skipped Task children excluded).
- Download each with `mcp_ado_wit_get_work_item_attachment`. For images, save with `savePath="Downloads"` (relative to user HOME) and read them with the image viewer; for documents, extract the text.
- Summarize each attachment's content that is relevant to test design (rules, data, edge cases, error codes, UI states), noting which work item/comment it came from.
- For unreadable attachments, record the ID/filename, owning work item and reason under unresolved artifacts.

## 6 — Read local documents (when provided)
- Parse each path in `source_local_doc_paths` (respecting `source_local_doc_types` when set).
- Support extraction from `md`, `txt`, `docx`, `pdf`, `xlsx` where possible.
- Capture acceptance rules, test data, business constraints, and edge cases.
- Record unreadable files (filename + reason) under unresolved artifacts.

## 7 — Consolidate linked-item scope
For each work item reviewed in step 3 (non-Task children, parent, predecessor, successor, related, referenced), consolidate title, type, state, description, acceptance criteria, comments and attachments into testable constraints. Convert every constraint that affects this story into a `requirements[]` entry with `source: "<Link type> #<id>"` (e.g. `Successor #1470255`), and record out-of-scope boundaries under constraints/dependencies rather than dropping them.

## 8 — Read SpecFlow / spec sources (when provided)
- When `source_repo_url` / `source_spec_root_path` / `source_feature_files` are set, read the `.feature` (or unit-test/spec) files via `mcp_ado_repo_get_file_content` or `mcp_ado_search_code`.
- Capture each Scenario / Scenario Outline and its `Examples` rows verbatim (client_id, client_secret, audience, grant_type, status codes, headers, etc.) for 1:1 mapping downstream.
- When `source_wiki_url` is set, read the page via `mcp_ado_wiki_get_page_content` (or `mcp_ado_search_wiki`).

## 9 — Build the intake summary (required)
Emit a structured summary. Generation must not start until this exists:
```
Resolved Story ID     : <id>
Resolved Story Title  : <title>
Project               : <project>
Parent                : <id> (<title>)
Children Reviewed     : <n> (<ids>) — non-Task children only
Children Skipped      : <n> (<ids>) — Task children, not reviewed
Predecessors Reviewed : <n> (<ids>) or none linked
Successors Reviewed   : <n> (<ids>) or none linked
Related Reviewed      : <n> (<ids>) or none linked
Other Links Reviewed  : <n> (<link type: ids>, incl. IDs referenced in description/AC) or none
Comments              : <n> on story; <n> across linked items
Attachment IDs Found  : <id> (<filename>, <owning work item/comment>), ...
Local Docs Reviewed   : <n> (<filenames>)
Feature/Spec Files    : <n> (<names>)
Reference Repo URL    : <url or n/a>
Test Instance URL     : <url or n/a>
Unresolved Artifacts  : <n> (<filename/id> — <reason>) or none
```

# Section U — Live UI exploration (when `ui_exploration.enabled` is `true`)
Runs after the source branch (A or B) has produced `requirements[]` / `spec_scenarios[]`, and augments them with evidence observed in the running application. Strictly read-only: observe, never mutate.

> **Prerequisite.** Before this pass, `testcases/scripts/preflight-exploration.ps1` must have verified/installed Playwright (Node.js + npm + Playwright CLI + Chromium). If Playwright is unavailable, record `ui_observations.explored = false` with the reason under `unresolved_artifacts` and continue with the written requirements.

1. **Resolve the URL.** Use `ui_exploration.app_url` when set; otherwise fall back to the first `http(s)://` URL found in `raw_input_file` / `input.txt`. If neither yields a URL, record `ui_observations.explored = false` and add an entry to `unresolved_artifacts` (`ref: "ui_exploration"`, `reason: "no app_url"`) — do not fabricate a URL.
2. **Launch.** Navigate to the URL with `mcp_playwright_browser_navigate`.
3. **Authenticate** per `ui_exploration.app_auth_strategy`:
   - `none` — proceed anonymously.
   - `env-var` — log in using `APP_USERNAME` / `APP_PASSWORD` before exploring protected screens. If either is missing, record the limitation under `unresolved_artifacts` and explore only what is reachable.
   - `cookie-file` — reuse the saved storage-state/cookie file.
4. **Derive targets.** Use `ui_exploration.target_paths` when provided; otherwise derive the screens/feature areas to visit from the story/requirements (the scenarios most relevant to the ACs). Respect `ui_exploration.max_pages` (default 12).
5. **For each screen (observe only):**
   a. Navigate and capture a DOM snapshot via `mcp_playwright_browser_snapshot` (prefer the accessibility snapshot; take `mcp_playwright_browser_take_screenshot` only when it adds clarity).
   b. Record the screen's purpose, the interactive controls present (inputs, buttons, links, selects, checkboxes, toggles), the available user actions/flows, visible validation/error/success messages, and observable states (empty/loading/disabled/enabled).
   c. Note client-side validation, required-field markers, default values, character limits, and any UI-only behaviour not stated in the written requirements.
   d. Identify components shared across screens (headers, nav, modals, toasts, tables).
   e. Do **not** submit forms, trigger payments, delete data, or otherwise change state; to probe validation, inspect messages already shown or rely on field metadata rather than committing actions.
6. **Fold into intake.** For each testable UI behaviour discovered, add a `requirements[]` entry with `source: "UI Exploration: <url>"`. Populate the `ui_observations` object (below). Add a line to the intake summary: `UI Exploration        : <n> screens (<url>)` — or `not enabled` / `attempted, unresolved (<reason>)`.
7. **Close** the browser session when done (`mcp_playwright_browser_close`).

# Section M — Live mobile-app exploration (when `mobile_exploration.enabled` is `true`)
Runs after the source branch (A or B) has produced `requirements[]` / `spec_scenarios[]`, and augments them with evidence observed in the running mobile app. Strictly read-only: observe, never mutate. Appium has **no MCP browser tool** — capture the UI hierarchy via Appium `page_source` / accessibility tree (short inline snippet) or Appium Inspector.

> **Prerequisite.** Before this pass, `testcases/scripts/preflight-exploration.ps1` must have verified/installed the Appium tooling (Python 3.9+ + Appium-Python-Client + selenium, and for local runs the Appium CLI + `uiautomator2`/`xcuitest` driver + `adb`/`xcrun`). If the required tooling is unavailable, record `mobile_observations.explored = false` with the reason under `unresolved_artifacts` and continue with the written requirements.

1. **Resolve the session capabilities** from `mobile_exploration`:
   - `local` — start an Appium session against `appium_server_url` with the platform capabilities (`android`: `app_package` + `app_activity`, or `app_path`; auto-launch `avd` when set. `ios`: `bundle_id` or `app_path`). If required capabilities are missing, record `mobile_observations.explored = false` and add an entry to `unresolved_artifacts` (`ref: "mobile_exploration"`, reason) — do not fabricate identifiers.
   - `browserstack` — start the session against `browserstack.hub_url` with `bstack:options` (`device`, `os_version`, `app_id`), using `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY`. If credentials or `app_id`/`device`/`os_version` are missing, record the limitation under `unresolved_artifacts` and stop the pass.
2. **Launch** the app and land on the first screen.
3. **Authenticate** per `mobile_exploration.app_auth_strategy`:
   - `none` — proceed anonymously.
   - `env-var` — log in using `APP_USERNAME` / `APP_PASSWORD` before exploring protected screens. If either is missing, record the limitation under `unresolved_artifacts` and explore only what is reachable.
4. **Derive targets.** Use `mobile_exploration.target_screens` when provided; otherwise derive the screens/feature areas from the story/requirements. Respect `mobile_exploration.max_screens` (default 12).
5. **For each screen (observe only):**
   a. Capture the UI hierarchy via Appium `page_source` / accessibility tree.
   b. Record the screen's purpose, the interactive elements present (text fields, buttons, tabs, toggles, switches, pickers, list rows, icons), the available user actions/flows, visible validation/error/success messages, and observable states (empty/loading/disabled/enabled).
   c. Note client-side validation, required-field markers, default values, input limits, and any app-only behaviour not stated in the written requirements.
   d. Identify components shared across screens (nav/tab bars, dialogs, toasts, spinners).
   e. Do **not** submit forms, complete purchases/payments, delete data, or otherwise change state.
6. **Fold into intake.** For each testable behaviour discovered, add a `requirements[]` entry with `source: "Mobile Exploration: <platform>/<execution_target>"`. Populate the `mobile_observations` object (below). Add a line to the intake summary: `Mobile Exploration    : <n> screens (<platform>/<execution_target>)` — or `not enabled` / `attempted, unresolved (<reason>)`.
7. **End** the Appium session when done.

# Outputs
```json
{
  "story": { "id": 0, "title": "string", "state": "string", "area_path": "string", "iteration_path": "string", "acceptance_criteria": ["string"] },
  "children": [{ "id": 0, "title": "string", "type": "string", "constraints": ["string"] }],
  "linked_items": [{ "id": 0, "link_type": "Parent | Child | Predecessor | Successor | Related | Duplicate | Tested By | Referenced", "title": "string", "type": "string", "state": "string", "comments_read": 0, "attachments_read": 0, "constraints": ["string"] }],
  "attachments": [{ "id": "string", "filename": "string", "summary": "string", "readable": true }],
  "local_docs": [{ "path": "string", "type": "string", "summary": "string", "readable": true }],
  "spec_scenarios": [{ "source_file": "string", "scenario": "string", "examples": [{ "col": "value" }], "asserts_headers": false }],
  "requirements": [{ "req_id": "REQ-001", "source": "[Work Item AC] | Spec: <file> | KB | Attachment | Child #<id> | UI Exploration: <url>", "text": "string" }],
  "ui_observations": {
    "explored": true,
    "app_url": "string",
    "pages": [{ "name": "string", "url": "string", "purpose": "string", "controls": ["string"], "actions": ["string"], "validations": ["string"], "states": ["string"] }],
    "flows": ["string"],
    "shared_components": ["string"],
    "notes": ["string"]
  },
  "mobile_observations": {
    "explored": true,
    "platform": "android | ios",
    "execution_target": "local | browserstack",
    "screens": [{ "name": "string", "purpose": "string", "controls": ["string"], "actions": ["string"], "validations": ["string"], "states": ["string"] }],
    "flows": ["string"],
    "shared_components": ["string"],
    "notes": ["string"]
  },
  "unresolved_artifacts": [{ "ref": "string", "reason": "string" }],
  "intake_summary": "string"
}
```

# Quality gate
- A resolved story ID and title, or the skill stops for Human resolution.
- Every acceptance criterion mapped to at least one `requirements[]` entry with a cited source.
- Every provided source (attachment, local doc, feature file, child) either summarized or listed under `unresolved_artifacts` with a reason — never silently dropped.
- Every work-item relation on the story (parent, non-Task child, predecessor, successor, related, duplicate, tested-by, and IDs referenced in description/AC) appears in `linked_items[]` (Task children are listed only as skipped in the intake summary) with its description, acceptance criteria, comments and attachments reviewed — or is listed under `unresolved_artifacts` with a reason.
- No field was accepted in truncated form; truncated fields were re-fetched in full.
- When `ui_exploration.enabled` is `true`: `ui_observations.explored` is `true` with at least one page observed, or the failure is recorded under `unresolved_artifacts` (never silently skipped). UI-only behaviours discovered during exploration are captured as `requirements[]` with `source: "UI Exploration: <url>"`.
- When `mobile_exploration.enabled` is `true`: `mobile_observations.explored` is `true` with at least one screen observed, or the failure is recorded under `unresolved_artifacts` (never silently skipped). App-only behaviours discovered during exploration are captured as `requirements[]` with `source: "Mobile Exploration: <platform>/<execution_target>"`.
