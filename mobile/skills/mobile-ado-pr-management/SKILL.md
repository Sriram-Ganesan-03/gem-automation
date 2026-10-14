---
name: mobile-ado-pr-management
description: "Use when creating an ADO Git pull request from a feature branch containing generated Robot Framework + Appium test files and assigning a reviewer with traceability links."
---

# Goal
Commit generated Robot Framework test files (locator resources, page-object keyword resources, config resources, `.robot` suites, and libraries) to a feature branch and open an ADO pull request with reviewer assignment and ADO traceability.

# Inputs
- `target_repo` — ADO repository name
- `target_branch` — base branch to merge into (e.g. `main`)
- `reviewer_ado_user_id`
- `build` — from `robot-test-generator` (`locator_files`, `page_object_files`, `suite_files`, `config_files`, `library_files`, `robot_config_file`)
- `story_title`
- `input_source` — `ado` or `raw-file`
- `user_story_ado_link` / `test_cases_ado_link` (ado mode) or `raw_input_file` (raw-file mode)
- `heal` — optional healing summary from `heal-tests`

# Prerequisites
- `ADO_PAT`, `ADO_ORG`, and `ADO_PROJECT` are available.
- `mcp_ado_repo_create_branch` and `mcp_ado_repo_create_pull_request` tools are available.

# Actions
1. Derive branch name from `story_title`: `mobile-tests/<kebab-story-title>`.
2. Create the feature branch off `target_branch` using `mcp_ado_repo_create_branch`.
3. Push each generated file to the feature branch via the ADO repo file API, preserving the layout:
   - `build.locator_files` → `<test_output_path>/resources/locators/`
   - `build.page_object_files` → `<test_output_path>/resources/keywords/`
   - `build.config_files` → `<test_output_path>/resources/config/`
   - `build.library_files` → `<test_output_path>/libraries/`
   - `build.suite_files` → `<test_output_path>/tests/`
   - **When `robot_project_mode` is `new`** and `build.robot_config_file` is not null: commit `robot.yaml` + `requirements.txt` to the repo root.
   - **When `robot_project_mode` is `existing`**: skip committing `robot.yaml`.
4. Build PR title: `[Mobile Tests] <story_title>`.
5. Build PR description with:
   - Suite files added and test count
   - **ado mode:** link to ADO user story and ADO test cases
   - **raw-file mode:** note the source file name; omit ADO story/test case links
   - Generation summary and any conversion warnings
   - **When `heal.enabled` is `true`:** a "Self-Healing" section listing healed locators (key, old → new selector, strategy) and a "Known Issues" section listing `heal.unhealed` / non-healable failures
6. Create the pull request with `mcp_ado_repo_create_pull_request`.
7. Assign reviewer via `mcp_ado_repo_update_pull_request_reviewers`.
8. **ado mode:** link PR to the ADO work item via `mcp_ado_wit_link_work_item_to_pull_request`. **raw-file mode:** skip work-item linking.

# Outputs
- `branch_name`
- `pull_request_id`
- `pull_request_url`
- `reviewer_ado_user_id`
- `review_status`
