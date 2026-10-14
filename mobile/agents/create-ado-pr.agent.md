---
name: mobile-create-ado-pr
description: "Use when committing generated Robot Framework + Appium test files to an ADO feature branch and opening a pull request with reviewer assignment and ADO work item traceability."
model: GPT-5.3-Codex
---

# Purpose
Commit generated Robot Framework test files (locator resources, page-object keyword resources, config resources, `.robot` suites, libraries) to a feature branch and create an ADO pull request linked to the originating user story and test cases.

# Inputs
- `input_source` — `ado` or `raw-file`; controls PR description and work-item linking
- `target_repo`
- `target_branch`
- `target_local_path` — optional override. The `.github` folder always lives inside the target project, so the project root is auto-derived as the repository/workspace root that contains `.github`. All generated files are written directly there (see step 3a).
- `reviewer_ado_user_id`
- `user_story_ado_link` / `test_cases_ado_link` — required when `input_source` is `ado`; null when `raw-file`
- `raw_input_file` — used in the PR description when `input_source` is `raw-file`
- `robot_project_mode` — `new` or `existing` (default: `new`)
- `build` — file lists and summary from `mobile-build-tests-from-ado`
- `heal` — optional healing summary from `mobile-heal-tests`

# Environment
- `ADO_PAT`, `ADO_ORG`, `ADO_PROJECT`

# Procedure
1. Derive branch name: `mobile-tests/<kebab-cased-story-title>`.
2. Create the branch off `target_branch` via `mcp_ado_repo_create_branch` (execute mode only). Before the call, run `mobile/scripts/assert-ado-operation.ps1 -Operation mcp_ado_repo_create_branch -RunMode execute`.
3. Commit all generated files to the feature branch (execute mode only):
   - `build.locator_files` → `<test_output_path>/resources/locators/`
   - `build.page_object_files` → `<test_output_path>/resources/keywords/`
   - `build.config_files` → `<test_output_path>/resources/config/`
   - `build.library_files` → `<test_output_path>/libraries/`
   - `build.suite_files` → `<test_output_path>/tests/`
   - **When `robot_project_mode` is `new`** and `build.robot_config_file` is not null: commit `robot.yaml` + `requirements.txt` to the **repo root**.
   - **When `robot_project_mode` is `existing`**: skip committing `robot.yaml`.
3a. **Local project sync:** Resolve `project_root` = `target_local_path` when provided, otherwise the auto-derived repository/workspace root that contains `.github`. Write all generated files DIRECTLY into `project_root` — this is the primary output target (`mobile/artifacts/` is a mirror copy only). Use the **detected structure** from `analysis.project_structure` when available (its `test_dir` and `folders`), falling back to `<test_output_path>/resources|libraries|tests` otherwise. Files that already exist are updated in place, not duplicated. This local write **always runs** in **both** `dry-run` and `execute` modes and is **independent of ADO** — prefer running `mobile/scripts/apply-robot-tests.ps1` (no `-TargetPath` derives the project root automatically, or from `target_local_path`).
4. Build PR title: `[Mobile Tests] <story_title>`.
5. Build PR description including:
   - Suite files added and test count
   - **`ado` mode:** link to ADO user story and ADO test cases
   - **`raw-file` mode:** note that scenarios came from `raw_input_file` (include file name); omit ADO links
   - Generation summary and any conversion warnings
   - **When `heal.enabled` is `true`:** a "Self-Healing" section listing healed locators (key, old → new selector, strategy) and a "Known Issues" section listing `heal.unhealed` / `heal.non_healable_failures`
6. Create the PR via `mcp_ado_repo_create_pull_request`.
7. Assign the reviewer via `mcp_ado_repo_update_pull_request_reviewers`.
8. **`ado` mode:** link the PR to the ADO work item via `mcp_ado_wit_link_work_item_to_pull_request`. **`raw-file` mode:** skip linking; note in `pr-payload.json` that the source was a raw file.
9. Write `mobile/artifacts/pr-payload.json` with all PR metadata.

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
Return success only if the PR is created and reviewer assignment is confirmed via the API response. In `dry-run` mode, the local project sync (step 3a) and `pr-payload.json` must still be produced.
