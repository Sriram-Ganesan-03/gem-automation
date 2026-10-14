# Agent Workflows

This repository contains four multi-agent workflows:
- **API** — converts ADO user story and test cases into a Postman collection folder and opens a Postman pull request.
- **UI** — converts ADO user story and test cases into Playwright `.spec.ts` tests and opens an ADO pull request.
- **Mobile** — converts ADO user story and test cases into keyword-driven Robot Framework + Appium tests (Python) and opens an ADO pull request.
- **Test Cases** — intakes an ADO user story and generates Positive/Negative/Boundary test cases, exports them to Excel, and optionally publishes them to an ADO test plan/suite.

---

## API Workflow (Postman)

### Start Here
Use the orchestrator defined in `.github/api/agents/orchestrator.agent.md`.

### Agent Order
1. `.github/api/agents/fork-assets.agent.md`
2. `.github/api/agents/analyze-structure.agent.md`
3. `.github/api/agents/build-folder-from-ado.agent.md`
4. `.github/api/agents/create-postman-pr.agent.md`

### Required Inputs
- reviewer_postman_user_id
- workspace_name
- collection_id_or_url
- environment_id_or_url
- user_story_ado_link
- test_cases_ado_link

### Required Environment Variables
- POSTMAN_API_KEY
- ADO_PAT
- ADO_ORG
- ADO_PROJECT

### Run Input Files
- Current run payload: `.github/api/config/workflow-input.current.json`
- Example payload: `.github/api/config/workflow-input.example.json`

### Skills Used
- postman-fork
- postman-collection-analysis
- ado-testcase-parser
- postman-folder-generator
- postman-pr-management

---

## UI Workflow (Playwright)

### Start Here
Use the orchestrator defined in `.github/ui/agents/orchestrator.agent.md`.

### Agent Order
1. `.github/ui/agents/analyze-app.agent.md` (Step 0 analyzes the local project structure first, then the app)
2. `.github/ui/agents/build-tests-from-ado.agent.md`
3. `.github/ui/agents/build-api-layer.agent.md` (optional — only when `api_layer.enabled` is `true`)
4. `.github/ui/agents/heal-tests.agent.md` (optional — only when `self_healing.enabled` is `true`)
5. `.github/ui/agents/create-ado-pr.agent.md`

### Required Inputs
- app_base_url
- app_auth_strategy
- test_output_path
- user_story_ado_link
- test_cases_ado_link
- reviewer_ado_user_id
- target_repo
- target_branch

### Required Environment Variables
- APP_BASE_URL
- ADO_PAT
- ADO_ORG
- ADO_PROJECT

### Run Input Files
- Current run payload: `.github/ui/config/workflow-input.current.json`
- Example payload: `.github/ui/config/workflow-input.example.json`

### Skills Used
- ado-testcase-parser
- raw-input-parser
- testcase-excel-to-rawinput
- playwright-app-analysis
- playwright-test-generator
- ui-ado-pr-management

---

## Mobile Workflow (Robot Framework + Appium)

### Start Here
Use the orchestrator defined in `.github/mobile/agents/orchestrator.agent.md`.

### Agent Order
1. `.github/mobile/agents/analyze-app.agent.md` (Step 0 analyzes the local project structure first, then the app via Appium)
2. `.github/mobile/agents/build-tests-from-ado.agent.md`
3. `.github/mobile/agents/heal-tests.agent.md` (optional — only when `self_healing.enabled` is `true`)
4. `.github/mobile/agents/create-ado-pr.agent.md`

### Required Inputs
- platform (`android` | `ios`)
- execution_target (`local` | `browserstack`)
- appium_server_url (local) or browserstack object (browserstack)
- app_auth_strategy
- test_output_path
- user_story_ado_link
- test_cases_ado_link
- reviewer_ado_user_id
- target_repo
- target_branch

### Required Environment Variables
- APPIUM_SERVER_URL (local) or BROWSERSTACK_USERNAME + BROWSERSTACK_ACCESS_KEY (browserstack)
- ADO_PAT
- ADO_ORG
- ADO_PROJECT

### Run Input Files
- Current run payload: `.github/mobile/config/workflow-input.current.json`
- Example payload: `.github/mobile/config/workflow-input.example.json`

### Skills Used
- ado-testcase-parser
- raw-input-parser
- testcase-excel-to-rawinput
- appium-app-analysis
- robot-test-generator
- mobile-ado-pr-management

---

## Test Cases Workflow (Authoring)

### Start Here
Use the orchestrator defined in `.github/testcases/agents/orchestrator.agent.md`.

### Agent Order
1. `.github/testcases/agents/author-testcases-from-ado.agent.md`
2. `.github/testcases/agents/publish-testcases-to-ado.agent.md` (optional — only when `output_mode` includes `ado`, in execute mode)

### Required Inputs
- ado_org_url
- ado_project
- user_story_id OR user_story_title_keywords
- output_mode (`excel` | `ado` | `both`)
- run_mode

### Optional Inputs
- authoring_phase (`development` | `enhancement`, default `development`) — one- or two-step authoring. `development`: initial baseline; exploration is optional (off while the story is in development, on when it is already deployed → single-pass). `enhancement` (optional Phase 2, only when the baseline was authored pre-deployment): reconciles the baseline (`enhancement.baseline_cases_path`, default `artifacts/testcases-<id>.json`) with live UI/mobile exploration (must be enabled) — cases tagged Unchanged/Updated/New/Obsolete-Candidate, UI-vs-AC mismatches logged as discrepancies, results written back into the same Phase 1 `.xlsx` (backup first) — no ADO writes, `output_mode` must be `excel`.
- ui_exploration (`enabled`, `app_url`, `app_auth_strategy`, `target_paths`, `max_pages`) — when enabled, intake navigates the running app with Playwright MCP and folds live UI observations into the requirements (read-only). URL comes from `app_url` or the first URL in `input.txt`.
- mobile_exploration (`enabled`, `platform`, `execution_target`, `appium_server_url`, `app_auth_strategy`, `app_package`/`app_activity`/`bundle_id`/`app_path`/`avd`, `browserstack`, `target_screens`, `max_screens`) — when enabled, intake drives the running mobile app via an Appium session (local or BrowserStack) and folds live screen observations into the requirements (read-only).

### Required Environment Variables
- ADO_PAT (via the shared PAT MCP launcher `ui/scripts/ado-mcp-launcher.ps1`)
- ADO_ORG
- ADO_PROJECT
- APP_USERNAME + APP_PASSWORD (only when `ui_exploration.app_auth_strategy` or `mobile_exploration.app_auth_strategy` is `env-var`)
- APPIUM_SERVER_URL + APP_PACKAGE/APP_ACTIVITY/BUNDLE_ID/APP_PATH (local) or BROWSERSTACK_USERNAME + BROWSERSTACK_ACCESS_KEY (browserstack) — only when `mobile_exploration.enabled` is `true`

### Run Input Files
- Current run payload: `.github/testcases/config/workflow-input.current.json`
- Example payload: `.github/testcases/config/workflow-input.example.json`

### Skills Used
- ado-story-intake
- testcase-generator
- excel-exporter
