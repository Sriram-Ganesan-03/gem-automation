---
applyTo: ".github/ui/config/workflow-input.current.json"
description: "Use when preparing a run for the Playwright UI ADO-to-tests workflow with concrete input values."
---

# Must Fill Before Run
- `app_base_url`
- `app_auth_strategy`
- `test_output_path`
- `reviewer_ado_user_id`
- `target_repo`
- `target_branch`
- `user_story_ado_link`
- `test_cases_ado_link`

# Required Environment Variables
- `APP_BASE_URL`
- `APP_USERNAME` (when `app_auth_strategy` is `env-var`)
- `APP_PASSWORD` (when `app_auth_strategy` is `env-var`)
- `ADO_PAT`
- `ADO_ORG` (expected: `everi`)
- `ADO_PROJECT` (expected: `Loyalty Kiosk`)

# Validation
1. Confirm all empty fields in `workflow-input.current.json` are filled.
2. Confirm ADO PAT has rights to read work items, test plans, and create branches/PRs.
3. Confirm `APP_BASE_URL` is reachable from this machine (Playwright MCP will navigate it).
4. Keep `run_mode` as `dry-run` until the generated spec files are reviewed.
5. Set execute only with `execution_confirmation=APPROVED_EXECUTE`.
6. Confirm `allow_ado_mutation=false` and `allow_probe_resources=false` before every run.
7. Run `ui/scripts/preflight-guardrails.ps1` and proceed only if it passes.
