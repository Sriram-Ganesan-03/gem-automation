---
applyTo: ".github/api/config/workflow-input.current.json"
description: "Use when preparing a run for the Postman ADO-to-collection workflow with concrete input values."
---

# Current ADO Inputs
- User story: `1326051`
- Test plan: `432931`
- Test suite: `1329228`

# Must Fill Before Run
- `reviewer_postman_user_id`
- `workspace_name`
- `collection_id_or_url`
- `environment_id_or_url`

# Required Environment Variables
- `POSTMAN_API_KEY`
- `ADO_PAT`
- `ADO_ORG` (expected: `everi`)
- `ADO_PROJECT` (expected: `Loyalty Kiosk`)

# Validation
1. Confirm all empty fields in `workflow-input.current.json` are filled.
2. Confirm ADO PAT has rights to read work items and test plans.
3. Confirm Postman API key can fork assets and create pull requests.
4. Keep `run_mode` as `dry-run` until the payload is reviewed.
5. Set execute only with `execution_confirmation=APPROVED_EXECUTE`.
6. Confirm `allow_ado_mutation=false` and `allow_probe_resources=false` before every run.
7. Run `api/scripts/preflight-guardrails.ps1` and proceed only if it passes.
8. Confirm `environment_strategy=use-input-existing` and `allow_environment_creation=false`.
9. Confirm only the provided `environment_id_or_url` is used during the run.
