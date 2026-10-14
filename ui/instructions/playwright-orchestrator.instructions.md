---
applyTo: ".github/ui/agents/orchestrator.agent.md"
description: "Use when running the Playwright UI testcase orchestrator to coordinate step agents and skill invocation."
---

# Orchestrator Skill Imports
The orchestrator should rely on these skills:
- `ado-testcase-parser`
- `playwright-app-analysis`
- `playwright-test-generator`
- `ui-ado-pr-management`

# Handoff Contract
## Step A to B (analyze-app → build-tests-from-ado)
Provide `page_map`, `locator_conventions`, `auth_pattern`, and `navigation_patterns`.

## Step B to C (build-tests-from-ado → create-ado-pr)
Provide `story_title`, `spec_files` (path + content), `test_count`, and `conversion_warnings`.

# Preflight Guard Checks
Run these checks before any mutation step:
1. `run_mode` is `dry-run` or `execute`.
2. If `run_mode=execute`, `execution_confirmation` must be `APPROVED_EXECUTE`.
3. `allow_ado_mutation` is `false`.
4. `allow_probe_resources` is `false`.
5. `APP_BASE_URL`, `ADO_PAT`, `ADO_ORG`, `ADO_PROJECT` are all set.
6. `target_repo` and `target_branch` resolve to an accessible ADO repository.
7. For every ADO operation, execute `ui/scripts/assert-ado-operation.ps1 -Operation <candidate_operation>` before calling it.

# Mutation Boundaries
- Allowed: read ADO work items and test cases; navigate app pages read-only; write spec files to artifacts; create branch and PR in execute mode only.
- Disallowed: any ADO work item write, any environment or config mutation, any application state change.
- Disallowed: creating test/probe branches not prefixed `ui-tests/`.

# Reporting Contract
Final report must include:
- Spec files produced (paths and test counts)
- ADO PR URL and branch name
- Reviewer ADO user ID
- Any conversion warnings
- Any analysis warnings (unreachable pages)
