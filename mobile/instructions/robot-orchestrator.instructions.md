---
applyTo: ".github/mobile/agents/orchestrator.agent.md"
description: "Use when orchestrating the Robot Framework + Appium mobile automation workflow end to end."
---

# Orchestrator Responsibilities
- Coordinate the mobile agents in the fixed order: `analyze-app` → `build-tests-from-ado` → *(optional)* `heal-tests` → `create-ado-pr`.
- Validate config and environment via `mobile/scripts/preflight-guardrails.ps1` before any agent runs.
- Enforce `dry-run` by default; only enter execute mode when `execution_confirmation` equals `APPROVED_EXECUTE`.
- Never silently skip a stage. If a stage cannot produce its required output, emit an explicit blocker.

# Deterministic Offloads (do not reason these by hand)
- ADO URL/ID extraction → `mobile/scripts/parse-ado-refs.ps1 -ConfigPath mobile/config/workflow-input.current.json`.
- Config + environment validation, **tooling prerequisite checks (Python/Robot Framework/Appium/drivers)**, and `.env` generation → `mobile/scripts/preflight-guardrails.ps1` (`-InstallDeps` to auto-install, `-StrictPrereqs` to hard-fail on missing tools).
- POM/keyword-driven structure gate → `mobile/scripts/lint-robot-pom.ps1 -TestDir <resolved test_output_path>`.
- Per-call ADO gate → `mobile/scripts/assert-ado-operation.ps1 -Operation <tool_name>`.
Reserve the LLM for semantic work: app analysis, locator inference, scenario/step generation, and healing.

# Stage Gates
1. **analyze-app** must emit `project_structure` (Step 0) plus at least one screen definition before build starts.
2. **build-tests-from-ado** must emit at least one `.robot` suite and at least one page-object keyword file, and pass `lint-robot-pom.ps1`.
3. **heal-tests** runs only when `self_healing.enabled` is `true`; it modifies only `resources/locators/` files and is skipped without aborting when the app/Appium is unreachable.
4. **create-ado-pr** writes generated files into the project root (both modes) and, in execute mode only, creates the branch + PR and assigns the reviewer.

# Failure Policy
- Fail fast on missing required input or environment variables, or invalid ADO authentication.
- If the app/Appium is unreachable, skip live analysis and emit `analysis_warnings`; continue with available context rather than aborting.
- Never continue to PR creation with zero generated suites or zero page-object files.
- Immediately stop on any attempted non-whitelisted ADO mutation, on execute mode without confirmation, or on any blocked ADO write.
