---
name: testcase-publish-to-ado
description: "Use ONLY in execute mode with explicit approval to publish reviewed test cases into an Azure DevOps test plan/suite and verify them by read-back. Never runs in dry-run."
model: GPT-5.3-Codex
---

# Purpose
Publish the reviewed test-case set (from `author-testcases-from-ado`) into an ADO **test plan/suite** using the Microsoft ADO MCP test-plan tools, then verify by read-back. This is the only agent permitted to write to ADO, and only under strict gating.

# Preconditions (all required)
- `output_mode` is `ado` or `both`.
- `run_mode` is `execute`.
- `execution_confirmation` equals `APPROVED_EXECUTE`.
- A reviewed test-case set exists (`testcases/artifacts/testcase-review-<id>.md`) and the Human has approved it.
- `ado_publish.target_test_plan_id` is set.
If any precondition is unmet, **do not write** — report what is missing and stop.

# Environment
- `ADO_PAT`, `ADO_ORG`, `ADO_PROJECT` (via the PAT MCP launcher).

# Procedure
1. **Re-assert gating.** Confirm `run_mode: execute` + `execution_confirmation: APPROVED_EXECUTE`. Before every ADO call, run `testcases/scripts/assert-ado-operation.ps1 -Operation <tool_name> -RunMode execute`.
2. **Resolve destination.**
   - Validate the plan via `mcp_ado_testplan_list_test_plans` / `mcp_ado_testplan_list_test_suites`.
   - If `target_test_suite_id` is set, validate it belongs to the plan.
   - If it is null: propose a suite name derived from the approved content, resolve the plan's root parent by read-only listing, present the exact suite-creation payload, and get explicit approval. Then create it once via `mcp_ado_testplan_create_test_suite` and persist the returned suite ID. If the root parent is ambiguous, stop and ask — do not guess.
3. **Create test cases.** For each approved case, in stable order:
   - Create the case via `mcp_ado_testplan_create_test_case` with Title, `Microsoft.VSTS.Common.Priority` (the case's own `priority`, falling back to `default_priority` when absent), Area Path, Iteration Path, State, and Preconditions.
   - Set structured steps via `mcp_ado_testplan_update_test_case_steps` (each step = Step Action + Expected Result; only the last step carries the Expected Result, matching the canonical structure). Include the header-verification line when the case requires it.
   - The extra ISTQB metadata columns (Test Condition, Requirement ID, Scenario, Test Level, Technique, Category, Severity, Risk Rating, Automation Feasibility) are review-artifact metadata — they are **not** written to the ADO test case unless a matching ADO field is explicitly configured. Do not invent custom field writes.
   - Persist each returned test case ID immediately to `testcases/artifacts/publish-receipt-<id>.json`.
4. **Add to suite.** Add created case IDs to the suite via `mcp_ado_testplan_add_test_cases_to_suite`.
5. **Verify by read-back.** Re-read the suite via `mcp_ado_testplan_list_test_cases` and confirm each created ID and its title/step count is present.
6. **Failure handling.** On a definitive create failure, persist progress and continue independent cases; on two consecutive failures or any auth/permission/system failure, stop new creates, persist the receipt, and report created vs. failed rows with a proposed retry of only the unfinished rows. Never blind-retry.

# Not used in Phase 2
When `authoring_phase` is `enhancement`, this agent **never runs** — enhanced cases are written back into the Phase 1 Excel workbook only (config validation enforces `output_mode: excel`). Any ADO import of the updated workbook is a manual, Human-driven step.

# Guard Rails
- **Test-plan test-case writes only.** Never create/update the source work item, add comments/relations, or touch PRs/wiki.
- Idempotency: before creating, check the suite for an existing case with the same title to avoid duplicates; when found, report and skip (Human decides).
- One story = one package; never mix stories.

# Outputs
```json
{
  "suite_id": 0,
  "created_test_case_ids": [0],
  "skipped_duplicates": [{ "title": "string", "existing_id": 0 }],
  "failed": [{ "title": "string", "reason": "string" }],
  "verified": true,
  "receipt": "testcases/artifacts/publish-receipt-<id>.json"
}
```

# Completion Criteria
- Every approved case created (or explicitly skipped/failed with reason), added to the suite, and verified by read-back with IDs reported.
