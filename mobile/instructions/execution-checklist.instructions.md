---
applyTo: ".github/mobile/agents/**/*.md"
description: "Pre-run validation checklist for the Robot Framework + Appium mobile automation workflow."
---

# Pre-Run Checklist

## 1. Config
- [ ] `mobile/config/workflow-input.current.json` exists (copied from `workflow-input.example.json`).
- [ ] `platform` is `android` or `ios`.
- [ ] `execution_target` is `local` or `browserstack`.
- [ ] Local: Android — `app_package` (and optionally `app_activity`) or `app_path` is set; iOS — `bundle_id` or `app_path` is set.
- [ ] BrowserStack: `browserstack.device`, `browserstack.os_version`, and `browserstack.app_id` (or `browserstack.app_path_upload`) are set.
- [ ] `appium_server_url`, `app_auth_strategy`, `test_output_path`, `input_source`, `run_mode` are present.
- [ ] Guardrail constants are exactly: `allow_ado_mutation=false`, `allow_probe_resources=false`, `ado_access_mode=read-only`, `ado_tool_calls_mode=read-wrapper-only`, `ado_write_tools_disabled=true`.

## 2. Input Source
- [ ] `input_source=ado` → `user_story_ado_link`/`user_story_id` and `test_cases_ado_link`/(`test_plan_id`+`test_suite_id`) present.
- [ ] `input_source=raw-file` → `raw_input_file` present and the file exists (`.md`, `.txt`, `.json`, or `.xlsx`).

## 3. Environment
- [ ] **Local:** Appium server running and reachable at `appium_server_url`; a device / emulator / simulator connected and visible (`adb devices` / Xcode simulator); the app installed or `app_path` set; Android Studio AVD started (or `avd` set for auto-launch).
- [ ] **BrowserStack:** `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` set; app uploaded (`browserstack.app_id` = `bs://<hash>`, or `browserstack.app_path_upload` provided); `browserstack.device` + `browserstack.os_version` selected.
- [ ] `APPIUM_SERVER_URL` resolvable (local) or `BROWSERSTACK_HUB_URL` (browserstack).
- [ ] `ADO_PAT`, `ADO_ORG`, `ADO_PROJECT` set when `input_source=ado` or `run_mode=execute`.
- [ ] `APP_USERNAME` / `APP_PASSWORD` set when `app_auth_strategy=env-var`.
- [ ] Python 3.9+ available with `robotframework`, `robotframework-appiumlibrary`, `Appium-Python-Client` (run preflight with `-InstallDeps` to install).

## 4. Execute Mode (only when run_mode=execute)
- [ ] `execution_confirmation=APPROVED_EXECUTE`.
- [ ] `reviewer_ado_user_id`, `target_repo`, `target_branch` set.

## 5. Preflight
- [ ] `pwsh mobile/scripts/preflight-guardrails.ps1` exits 0 (validates config + env, checks tooling prerequisites, writes `.env`).
- [ ] Tooling prerequisites satisfied — Python 3.9+, `robotframework`, `robotframework-appiumlibrary`, `Appium-Python-Client`, and (local target) Node.js, the Appium CLI, the platform driver (`uiautomator2`/`xcuitest`), and `adb`/Xcode. Run `-InstallDeps` to auto-install the Python packages, Appium, and drivers; run `-StrictPrereqs` to fail the preflight when any required tool is missing.

## 6. Post-Build Gate
- [ ] `pwsh mobile/scripts/lint-robot-pom.ps1 -TestDir <test_output_path>` exits 0 (no raw locators in suites; no test cases in keyword files; no keywords in locator files).
