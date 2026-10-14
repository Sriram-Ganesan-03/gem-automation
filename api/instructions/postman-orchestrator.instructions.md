---
applyTo: ".github/api/agents/orchestrator.agent.md"
description: "Use when running the Postman testcase orchestrator to coordinate step agents and skill invocation."
---

# Orchestrator Skill Imports
The orchestrator should rely on these skills:
- `postman-fork`
- `postman-collection-analysis`
- `ado-testcase-parser`
- `postman-folder-generator`
- `postman-pr-management`

# Handoff Contract
## Step A to B
Provide forked asset IDs and URLs.

## Step B to C
Provide analyzed conventions for folder, request naming, auth, variables, and scripts.

## Step C to D
Provide generated folder summary, request count, test count, and warnings.

# Preflight Guard Checks
Run these checks before any mutation step:
1. `run_mode` is `dry-run` or `execute`.
2. If `run_mode=execute`, `execution_confirmation` must be `APPROVED_EXECUTE`.
3. `allow_ado_mutation` is `false`.
4. `allow_probe_resources` is `false`.
5. Target workspace and source assets resolve exactly to provided input.
6. For every ADO operation, execute `api/scripts/assert-ado-operation.ps1 -Operation <candidate_operation>` before calling it.

# Mutation Boundaries
- Allowed: duplicate/fork source collection; reuse input environment only; create folder/requests only in duplicated collection; create PR from duplicate to source collection.
- Disallowed: any ADO write, any workspace metadata update, any non-workflow resource creation.
- Disallowed: creating, forking, or duplicating environments.

# Reporting Contract
Final report must include:
- Forked collection URL
- Selected input environment URL
- New folder name and count summary
- Pull request URL
- Reviewer user ID
- Any conversion warnings
