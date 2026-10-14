---
name: ui-create-ado-pr
description: "Use when committing generated Playwright spec files to an ADO feature branch and opening a pull request with reviewer assignment and ADO work item traceability."
model: GPT-5.3-Codex
---

# Purpose
Commit generated Playwright `.spec.ts` files to a feature branch and create an ADO pull request linked to the originating user story and test cases.

# Inputs
- `input_source` — `ado` or `raw-file`; controls PR description and work-item linking behaviour
- `target_repo`
- `target_branch`
- `target_local_path` — **optional override**. The `.github` folder always lives inside the target project, so the project root is auto-derived as the repository/workspace root that contains `.github`. All generated files are written directly there (see step 3a). Set this only to target a different directory. Independent of ADO PR creation.
- `reviewer_ado_user_id`
- `user_story_ado_link` — required when `input_source` is `ado`; null when `raw-file`
- `test_cases_ado_link` — required when `input_source` is `ado`; null when `raw-file`
- `raw_input_file` — path to the source file; used in PR description when `input_source` is `raw-file`
- `playwright_project_mode` — `new` or `existing` (default: `new`)
- `build` — spec file list and summary from `ui-build-tests-from-ado`

# Environment
- `ADO_PAT`
- `ADO_ORG`
- `ADO_PROJECT`

# Procedure
1. Derive branch name: `ui-tests/<kebab-cased-story-title>`.
2. Create branch off `target_branch` via `mcp_ado_repo_create_branch`.
3. Commit all POM files to the feature branch via `mcp_ado_repo_get_file_content` write path:
   - All files in `build.locator_files` → `<test_output_path>/locators/`
   - All files in `build.page_class_files` → `<test_output_path>/pages/`
   - All files in `build.spec_files` → `<test_output_path>/specs/`
   - **When `playwright_project_mode` is `new`** and `build.playwright_config_file` is not null: commit `ui/artifacts/playwright.config.ts` to the **repo root** (not inside `test_output_path`).
   - **When `playwright_project_mode` is `existing`**: skip committing `playwright.config.ts` entirely.
3a. **Local project sync:** Resolve `project_root` = `target_local_path` when provided, otherwise the auto-derived repository/workspace root that contains `.github`. Write all generated files DIRECTLY into `project_root` — this is the primary output target (`ui/artifacts/` keeps a mirror copy only as a working log). Use the **detected structure** from `analysis.project_structure` when available: place files under its `test_dir` and `folders` (falling back to `<test_output_path>/locators|pages|specs` only when no structure was detected). Files that already exist are updated in place, not duplicated:
   - `build.locator_files` → `<project_root>/<test_dir>/locators/`
   - `build.page_class_files` → `<project_root>/<test_dir>/pages/`
   - `build.spec_files` → `<project_root>/<test_dir>/specs/`
   - API-layer files (when present) → `<project_root>/<test_dir>/api/`
   - **When `playwright_project_mode` is `new`**: write `playwright.config.ts` to `<project_root>` root.
   This local write **always runs** (there is always a project root, since `.github` lives inside the project) in **both** `dry-run` and `execute` modes and is **independent of ADO** — it is the mechanism for iterating directly against the local repo. Prefer running `ui/scripts/apply-playwright-tests.ps1` (with no `-TargetPath`, which derives the project root automatically, or from `target_local_path` when that override is set) to perform the write deterministically.
4. Build PR title: `[UI Tests] <story_title>`.
5. Build PR description including:
   - Spec files added and test count
   - **When `input_source` is `ado`:** link to ADO user story (`user_story_ado_link`) and link to ADO test cases (`test_cases_ado_link`)
   - **When `input_source` is `raw-file`:** note that test scenarios were sourced from `raw_input_file` (include file name); omit ADO story/test case links
   - Generation summary and any conversion warnings
   - **When `heal.enabled` is `true`:** a "Self-Healing" section listing healed locators (`heal.healed`: key, old → new selector, strategy), and a "Known Issues" section listing `heal.unhealed` and `heal.non_healable_failures` so the reviewer sees unresolved failures
6. Create PR via `mcp_ado_repo_create_pull_request`.
7. Assign reviewer via `mcp_ado_repo_update_pull_request_reviewers`.
8. **When `input_source` is `ado`:** link PR to ADO work item via `mcp_ado_wit_link_work_item_to_pull_request`.
   **When `input_source` is `raw-file`:** skip work-item linking; log a note in `pr-payload.json` that source was a raw file.
9. Write `ui/artifacts/pr-payload.json` with all PR metadata.

# Outputs
```json
{
  "branch_name": "string",
  "pull_request_id": "string",
  "pull_request_url": "string",
  "reviewer_ado_user_id": "string",
  "review_status": "assigned"
}
```

# Quality Gate
Return success only if PR is created and reviewer assignment is confirmed via API response.
