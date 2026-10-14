---
name: ui-ado-pr-management
description: "Use when creating an ADO Git pull request from a feature branch containing generated Playwright spec files and assigning a reviewer with traceability links."
---

# Goal
Commit generated Playwright spec files to a feature branch and open an ADO pull request with reviewer assignment and ADO traceability.

# Inputs
- `target_repo` — ADO repository name
- `target_branch` — base branch to merge into (e.g. `main`)
- `reviewer_ado_user_id`
- `spec_files` — from `playwright-test-generator`
- `story_title`
- `user_story_ado_link`
- `test_cases_ado_link`
- `build_summary` — test count and spec file list

# Prerequisites
- `ADO_PAT`, `ADO_ORG`, and `ADO_PROJECT` are available.
- `mcp_ado_repo_create_branch` and `mcp_ado_repo_create_pull_request` tools are available.

# Actions
1. Derive branch name from `story_title` in the format `ui-tests/<kebab-story-title>`.
2. Create feature branch off `target_branch` using `mcp_ado_repo_create_branch`.
3. Push each spec file in `spec_files` to the feature branch via ADO repo file API.
4. Build PR title as `[UI Tests] <story_title>`.
5. Build PR description with: spec file list, test count, ADO user story link, ADO test case link, generation summary.
6. Create pull request with `mcp_ado_repo_create_pull_request`.
7. Assign reviewer via `mcp_ado_repo_update_pull_request_reviewers`.
8. Link PR to ADO work item via `mcp_ado_wit_link_work_item_to_pull_request`.

# Outputs
- `branch_name`
- `pull_request_id`
- `pull_request_url`
- `reviewer_ado_user_id`
- `review_status`
