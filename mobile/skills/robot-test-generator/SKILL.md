---
name: robot-test-generator
description: "Use when converting parsed ADO/raw test scenarios and Appium app-analysis output into keyword-driven Robot Framework + Appium files: object-repository locator resources, page-object keyword resources, config resources, and .robot test suites that call page-object keywords only."
---

# Goal
Generate a full keyword-driven POM Robot Framework + Appium test suite from test scenarios and app-analysis output. Produce four layers: Object Repository (locator resources), Page Objects (keyword resources), Config (session + shared variables), and Test Suites (`.robot`).

# POM Layer Definitions
| Layer | Folder | File pattern | Responsibility |
|---|---|---|---|
| Object Repository | `resources/locators/` | `<screen>.locators.resource` | Pure `*** Variables ***` locator constants. No AppiumLibrary imports. One file per screen/component. |
| Page Objects | `resources/keywords/` | `<screen>.page.resource` | `*** Keywords ***` that import the screen's locator resource and wrap every interaction as a business keyword. |
| Config | `resources/config/` | `common.resource`, `capabilities.resource` | Session bootstrap, suite setup/teardown, shared variables read from env vars. |
| Test Suites | `tests/` | `<story-kebab>.robot` | `*** Test Cases ***` calling page-object keywords only. Never contain raw locators. |
| Custom Libraries | `libraries/` | `VersionLocators.py`, others | Python helpers (version-scoped locator resolver, data builders). |

# Inputs
- `test_scenarios` — from `ado-testcase-parser` / `raw-input-parser`
- `screen_definitions` — from `appium-app-analysis` (includes `locators`, `keywords`, `page_resource`, `locator_resource` per screen)
- `shared_component_locators` — from `appium-app-analysis`
- `auth_pattern` — from `appium-app-analysis`
- `story_title`
- `platform`, `test_output_path`, `report_output_path`
- `execution_target` — `local` (Android Studio emulator/AVD, physical device, or iOS simulator via local Appium) or `browserstack` (BrowserStack App Automate). Only affects the generated `common.resource` session bootstrap — locators, keywords, and suites are identical across targets.
- `screenshot_mode` — `all` | `on-failure` | `none` (default: `on-failure`)
- `log_level` — `step` | `action` | `none` (default: `step`)
- `spec_name_override` (optional)

# Prerequisites
- Appium capabilities available via env vars (used in the config layer).

# Generation Rules

## Config — `resources/config/common.resource` *(generated first, before any suite or keyword)*
The **single source of truth** for runtime values and session lifecycle. No suite or keyword file reads env vars directly — they import this file. It reads Appium capabilities from environment variables (populated by `preflight-guardrails.ps1` into `.env`, or exported in the shell/CI). The session keyword branches on **`${EXECUTION_TARGET}`** so the same suites run on a **local** Appium server (Android Studio emulator/AVD, a physical device, or an iOS simulator) **or** on **BrowserStack** App Automate — with no change to locators, keywords, or tests.

```robotframework
*** Settings ***
Library    AppiumLibrary
Library    OperatingSystem
Library    Collections

*** Variables ***
# All values are read from environment variables — never hardcode credentials or device details.
${EXECUTION_TARGET}     %{EXECUTION_TARGET=local}
${APPIUM_SERVER_URL}    %{APPIUM_SERVER_URL=http://127.0.0.1:4723}
${PLATFORM}             %{MOBILE_PLATFORM=android}
${DEVICE_NAME}          %{DEVICE_NAME=emulator-5554}
${AVD}                  %{AVD=}
${PLATFORM_VERSION}     %{PLATFORM_VERSION=}
${AUTOMATION_NAME}      %{AUTOMATION_NAME=UiAutomator2}
${APP_PACKAGE}          %{APP_PACKAGE=}
${APP_ACTIVITY}         %{APP_ACTIVITY=}
${BUNDLE_ID}            %{BUNDLE_ID=}
${APP_PATH}             %{APP_PATH=}
${APP_VERSION}          %{APP_VERSION=0.0.0}
${APP_USERNAME}         %{APP_USERNAME=}
${APP_PASSWORD}         %{APP_PASSWORD=}
# BrowserStack (only used when EXECUTION_TARGET == browserstack)
${BROWSERSTACK_USERNAME}      %{BROWSERSTACK_USERNAME=}
${BROWSERSTACK_ACCESS_KEY}    %{BROWSERSTACK_ACCESS_KEY=}
${BROWSERSTACK_HUB_URL}       %{BROWSERSTACK_HUB_URL=https://hub-cloud.browserstack.com/wd/hub}
${BS_APP_ID}                  %{BS_APP_ID=}
${BS_DEVICE}                  %{BS_DEVICE=}
${BS_OS_VERSION}              %{BS_OS_VERSION=}
${BS_PROJECT_NAME}            %{BS_PROJECT_NAME=Mobile Tests}
${BS_BUILD_NAME}              %{BS_BUILD_NAME=local-build}
${SCREENSHOT_DIR}       ${OUTPUT DIR}/screenshots

*** Keywords ***
Open Application Session
    [Documentation]    Starts the Appium session for the configured execution target and platform.
    Run Keyword If    '${EXECUTION_TARGET}' == 'browserstack'    Open BrowserStack Session
    ...    ELSE IF    '${PLATFORM}' == 'android'    Open Local Android Session
    ...    ELSE    Open Local iOS Session
    Register Keyword To Run On Failure    Capture Page Screenshot

Open Local Android Session
    [Documentation]    Local Appium server driving an Android Studio emulator/AVD or a physical device.
    Open Application    ${APPIUM_SERVER_URL}
    ...    platformName=Android    automationName=${AUTOMATION_NAME}
    ...    deviceName=${DEVICE_NAME}    avd=${AVD}
    ...    appPackage=${APP_PACKAGE}    appActivity=${APP_ACTIVITY}
    ...    app=${APP_PATH}    autoGrantPermissions=true    newCommandTimeout=120

Open Local iOS Session
    [Documentation]    Local Appium server driving an iOS simulator or device.
    Open Application    ${APPIUM_SERVER_URL}
    ...    platformName=iOS    automationName=${AUTOMATION_NAME}
    ...    deviceName=${DEVICE_NAME}    platformVersion=${PLATFORM_VERSION}
    ...    bundleId=${BUNDLE_ID}    app=${APP_PATH}    newCommandTimeout=120

Open BrowserStack Session
    [Documentation]    BrowserStack App Automate — session against the BrowserStack hub with bstack:options.
    &{bstack_options}=    Create Dictionary
    ...    userName=${BROWSERSTACK_USERNAME}    accessKey=${BROWSERSTACK_ACCESS_KEY}
    ...    deviceName=${BS_DEVICE}    osVersion=${BS_OS_VERSION}
    ...    projectName=${BS_PROJECT_NAME}    buildName=${BS_BUILD_NAME}    sessionName=${SUITE NAME}
    Open Application    ${BROWSERSTACK_HUB_URL}
    ...    platformName=${PLATFORM}    automationName=${AUTOMATION_NAME}
    ...    app=${BS_APP_ID}    bstack:options=${bstack_options}    newCommandTimeout=120

Close Application Session
    [Documentation]    Ends the Appium session.
    Close Application
```

> Add extra environment-specific variables (e.g. tenant id) as `%{VAR=default}` reads. `APP_VERSION` is read only here. For BrowserStack, the app is referenced by `${BS_APP_ID}` (a `bs://<hash>` produced by uploading the binary via the BrowserStack app-upload REST API); credentials come from `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` and are never written into generated files.

## Object Repository — `resources/locators/<screen>.locators.resource`
- One file per screen in `screen_definitions`.
- A single `*** Variables ***` section — no `*** Keywords ***`, no AppiumLibrary import.
- Each key is the `UPPER_SNAKE_CASE` locator name; each value is an explicit-strategy Appium locator.

Example:
```robotframework
*** Variables ***
# Object Repository — Login screen. Locator variables only; no keywords.
${LOGIN_USERNAME_INPUT}    accessibility_id=username
${LOGIN_PASSWORD_INPUT}    accessibility_id=password
${LOGIN_SUBMIT_BUTTON}     accessibility_id=Sign in
${LOGIN_ERROR_LABEL}       id=com.everi.loyalty.kiosk:id/login_error
```

Add one `shared-components.locators.resource` for `shared_component_locators`.

## Page Objects — `resources/keywords/<screen>.page.resource`
- One resource per screen, importing its locator resource and `common.resource`.
- Keyword names are Title Case business actions describing **what** the user does.
- Every interaction references a locator variable; always wait before interacting.
- Each keyword has a `[Documentation]` line.
- **When `log_level` is `action` or `step`:** add `Log    [<Screen>] <Keyword> — start` / `— done` bracketing the keyword body.

Example (`log_level: action`):
```robotframework
*** Settings ***
Resource    ../locators/login.locators.resource
Resource    ../config/common.resource
Library     AppiumLibrary

*** Keywords ***
Open Login Screen
    [Documentation]    Ensures the login screen is displayed. Locator: ${LOGIN_USERNAME_INPUT}
    Log    [Login] Open Login Screen — start
    Wait Until Element Is Visible    ${LOGIN_USERNAME_INPUT}    timeout=20s
    Log    [Login] Open Login Screen — done

Enter Username
    [Documentation]    Enters the username. Locator: ${LOGIN_USERNAME_INPUT}
    [Arguments]    ${username}
    Log    [Login] Enter Username — start
    Wait Until Element Is Visible    ${LOGIN_USERNAME_INPUT}    timeout=20s
    Input Text    ${LOGIN_USERNAME_INPUT}    ${username}
    Log    [Login] Enter Username — done

Enter Password
    [Documentation]    Enters the password. Locator: ${LOGIN_PASSWORD_INPUT}
    [Arguments]    ${password}
    Input Password    ${LOGIN_PASSWORD_INPUT}    ${password}

Submit Login Form
    [Documentation]    Taps the Sign In button. Precondition: username and password entered.
    Wait Until Element Is Visible    ${LOGIN_SUBMIT_BUTTON}    timeout=20s
    Click Element    ${LOGIN_SUBMIT_BUTTON}

Get Login Error Message
    [Documentation]    Returns the visible login error text. Locator: ${LOGIN_ERROR_LABEL}
    Wait Until Element Is Visible    ${LOGIN_ERROR_LABEL}    timeout=20s
    ${text}=    Get Text    ${LOGIN_ERROR_LABEL}
    RETURN    ${text}

Verify Login Error Contains
    [Documentation]    Asserts the login error contains the expected fragment.
    [Arguments]    ${expected}
    ${actual}=    Get Login Error Message
    Should Contain    ${actual}    ${expected}
```

> When `log_level` is `none`, omit all `Log` lines.

## Version-Scoped Locators (`libraries/VersionLocators.py` + `Resolve Locator`)
Emit this once for every project so any locator can later become version-scoped by editing **only** the locators layer. Plain-string locators keep working unchanged.

```python
# libraries/VersionLocators.py — pure Python, no Appium imports.
"""Resolve a version-scoped locator to a concrete Appium selector for the active app version."""
from __future__ import annotations
from typing import Mapping, Sequence

# Registry: locator name -> newest-first list of {"since": semver, "selector": str}.
# Healing appends new entries here; it never deletes a still-valid older selector.
VERSIONED: dict[str, Sequence[Mapping[str, str]]] = {}


def _cmp(a: str, b: str) -> int:
    pa = [int(x) for x in a.split(".")[:3]] + [0, 0, 0]
    pb = [int(x) for x in b.split(".")[:3]] + [0, 0, 0]
    for i in range(3):
        if pa[i] != pb[i]:
            return 1 if pa[i] > pb[i] else -1
    return 0


def resolve_locator(name_or_value: str, app_version: str = "0.0.0") -> str:
    """If ``name_or_value`` is a registered version-scoped name, return the selector
    whose ``since`` is the highest that is <= ``app_version``; otherwise return the
    input unchanged (plain-string locator)."""
    entries = VERSIONED.get(name_or_value)
    if not entries:
        return name_or_value
    applicable = [e for e in entries if _cmp(app_version, e["since"]) >= 0]
    if not applicable:
        return sorted(entries, key=lambda e: e["since"])[0]["selector"]
    return sorted(applicable, key=lambda e: e["since"], reverse=True)[0]["selector"]
```

Expose it to Robot via a thin keyword in `common.resource`:
```robotframework
Library    ../../libraries/VersionLocators.py
...
Resolve Locator
    [Arguments]    ${name_or_value}
    ${selector}=    Resolve Locator    ${name_or_value}    ${APP_VERSION}
    RETURN    ${selector}
```
Page-object keywords may resolve a locator via `${LOC}=    Resolve Locator    ${LOGIN_SUBMIT_BUTTON}` before use. For plain-string locators the resolver returns them unchanged.

## Test Suites — `tests/<story-kebab>.robot`
- One suite per user story.
- `Resource` the page-object keyword files and `common.resource` — never a locator file directly.
- `Suite Setup    Open Application Session` (+ login when `auth_pattern` is not `none`); `Suite Teardown    Close Application Session`.

### Single Sequential Flow (default)
- **By default, generate ONE single `Test Case` that runs all of the story's ADO test cases in order as one end-to-end flow.** Do not emit a separate `Test Case` per ADO test case unless a split is explicitly called for (see below).
- Inside that single `Test Case`, precede each ADO test case's steps with a `Log    ▶ <TC id> — <TC title>` grouping comment, and tag the whole flow with every ADO id: `[Tags]    ADO-TC-<id1>    ADO-TC-<id2>    ...`; keep `Force Tags    ADO-Story-<id>` at suite level.
- Order the test-case steps to preserve any required sequence — in whichever direction the scenario dictates (a UI precondition before a dependent API/back-office check, or the reverse, and vice versa). A single `Test Case` guarantees this ordering; independent test cases running in parallel cannot.

### When to split into multiple `Test Case`s (opt-in)
Produce multiple `Test Case`s **only when a split is explicitly called for**, i.e. any of: the workflow input / caller explicitly requests separate tests, an ADO test case is explicitly marked independent / standalone, or the caller explicitly asks for isolation/parallelism with no ordering dependency. When splitting, each `Test Case` maps to one ADO test case and is tagged `[Tags]    ADO-TC-<id>`. In `raw-file` mode, tag with the source file + scenario title in either mode.
- Test steps call page-object keywords only — no raw AppiumLibrary keywords or locator strings.
- Never embed literal credentials, URLs, or PII in test/keyword names, `Log` messages, tags, or screenshot names — reference them generically and pull values from config/test-data variables.
- **When `log_level` is `step`/`action`:** add `Log    ▶ <step description>` before each step grouping.
- **When `screenshot_mode` is `all`:** `Capture Page Screenshot    ${SCREENSHOT_DIR}/<kebab-test>-<kebab-step>.png` after each step.

Example (`log_level: step`, `screenshot_mode: on-failure`):
```robotframework
*** Settings ***
Documentation     User Login — generated from ADO Story 1326051.
Resource          ../resources/keywords/login.page.resource
Resource          ../resources/keywords/dashboard.page.resource
Resource          ../resources/config/common.resource
Library           AppiumLibrary
Suite Setup       Open Application Session
Suite Teardown    Close Application Session
Force Tags        ADO-Story-1326051

*** Variables ***
# Non-sensitive, scenario-specific test data.
${INVALID_USER}    invalid_user

*** Test Cases ***
Logs In With Valid Credentials
    [Documentation]    Valid credentials take the user to the dashboard.
    [Tags]    ADO-TC-4521
    Log    ▶ Open the login screen
    Open Login Screen
    Log    ▶ Enter the username (from config)
    Enter Username    ${APP_USERNAME}
    Log    ▶ Enter the password (from config)
    Enter Password    ${APP_PASSWORD}
    Log    ▶ Submit the login form
    Submit Login Form
    Log    ▶ Verify the dashboard is displayed
    Verify Dashboard Is Displayed

Shows Error For Invalid Credentials
    [Documentation]    Invalid credentials show an error message.
    [Tags]    ADO-TC-4522
    Log    ▶ Open the login screen
    Open Login Screen
    Log    ▶ Enter an invalid username (from test data)
    Enter Username    ${INVALID_USER}
    Log    ▶ Enter a wrong password (from config)
    Enter Password    ${APP_PASSWORD}
    Log    ▶ Submit and verify the error message
    Submit Login Form
    Verify Login Error Contains    Invalid credentials
```

## Project Config — `robot.yaml` + `requirements.txt`
Generate at the project root **only when `robot_project_mode` is `new`** (skip when `existing`, and add a warning). `robot.yaml` documents the run for `rcc`/CI; the canonical run command is `robot`.

`robot.yaml`:
```yaml
tasks:
  Run Mobile Tests:
    shell: robot --outputdir results mobile-tests/tests
condaConfigFile: conda.yaml
artifactsDir: results
PATH:
  - .
PYTHONPATH:
  - .
```

`requirements.txt`:
```
robotframework>=6.1
robotframework-appiumlibrary>=2.0
Appium-Python-Client>=3.1
```

# Outputs
```json
{
  "story_title": "string",
  "locator_files": [ { "file_path": "string", "locator_count": 0, "screen_name": "string" } ],
  "page_object_files": [ { "file_path": "string", "keyword_count": 0, "screen_name": "string" } ],
  "suite_files": [ { "file_path": "string", "test_count": 0, "scenario_ids": ["string"] } ],
  "config_files": ["string"],
  "library_files": ["string"],
  "robot_config_file": "robot.yaml | null",
  "report_locations": {
    "output_xml": "results/output.xml",
    "log_html": "results/log.html",
    "report_html": "results/report.html"
  },
  "conversion_warnings": ["string"]
}
```

# Quality Gate
> Run `mobile/scripts/lint-robot-pom.ps1 -TestDir <resolved test_output_path>` after writing files and fix any reported rows before finishing.
- Every fetched/parsed test case is either converted to a step grouping within the single-flow `Test Case` (default) or to its own `Test Case` (when splitting is explicitly called for), or listed under `conversion_warnings`.
- No test suite contains raw locator strings or raw AppiumLibrary interaction keywords — all interactions go through page-object keywords.
- Every page-object resource imports only its corresponding locator resource (plus `common.resource`).
- No locator resource contains a `*** Keywords ***` section or AppiumLibrary import.
- By default there is exactly ONE `Test Case` (the single sequential flow) tagged with every ADO test case id (`ADO-TC-<id>` per case) in `ado` mode; multiple `Test Case`s appear only when a split is explicitly called for, each tagged with its own `ADO-TC-<id>`. In `raw-file` mode use a comment/tag citing the source file and scenario title instead.
