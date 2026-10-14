---
applyTo: ".github/api/agents/**/*.md"
description: "Use when authoring or executing Postman automation agents for ADO test case conversion workflows."
---

# Required Input Contract
Every workflow run must include:
- `reviewer_postman_user_id`
- `workspace_name`
- `collection_id_or_url`
- `environment_id_or_url`
- `user_story_ado_link`
- `test_cases_ado_link`

# Runtime Requirements
- Postman authentication uses `POSTMAN_API_KEY`.
- ADO extraction uses `ADO_PAT`, `ADO_ORG`, and `ADO_PROJECT`.
- Execute mode requires `execution_confirmation=APPROVED_EXECUTE`.
- ADO access mode must be `read-only`.
- Target workspace type must be `team`.
- ADO tool call mode must be `read-wrapper-only`.
- ADO write tools must be disabled (`ado_write_tools_disabled=true`).

# Execution Rules
1. Execute in this order only: fork -> analyze -> build -> PR.
2. Do not skip analysis before generation.
3. Do not create PR if build step contains fatal conversion errors.
4. Ensure reviewer is assigned by Postman user ID.
5. Default to `run_mode=dry-run`; require explicit switch for execute.
6. Do not perform ADO write operations (no add/update/comment/link/unlink).
7. Do not create probe resources (`_probe-*`) in any external system.
8. Do not mutate any Postman asset outside the target duplicated collection and provided input environment reference.
9. On any unintended mutation, stop and request user direction before continuing.
10. Allowed ADO operations are read-only: fetch/query/list/get test cases and work items.
11. Fork or duplication is allowed only in a workspace whose resolved type is `team`.
12. Environment handling is `use-input-existing` only.
13. Do not create, fork, or duplicate environments; always reuse `environment_id_or_url` from input.
14. Before every ADO tool/API call, run `api/scripts/assert-ado-operation.ps1 -Operation <tool_name>`.
15. If the assertion fails, do not call the endpoint; stop and ask user direction.

# Quality Rules
- Preserve detected auth, variable, and script conventions.
- Ensure generated folder naming is deterministic from story and scenario context unless explicitly overridden.
- Include ADO links in PR description for traceability.
