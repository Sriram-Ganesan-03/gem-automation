---
name: appium-app-analysis
description: "Use when inspecting a live mobile application with Appium to discover screen structure, page-object keyword definitions, object-repository locator variables, auth patterns, and interaction conventions needed for Robot Framework test generation."
---

# Goal
Analyze the target mobile application by inspecting it through an Appium session and produce keyword-driven Page Object Model (POM) definitions: one locator set and one page-object keyword blueprint per screen, plus shared component patterns.

# POM Output Structure
Every screen analysed produces two artifacts:
- **Locator resource** (`resources/locators/<screen>.locators.resource`) — pure `*** Variables ***`, no AppiumLibrary imports, used as the Object Repository.
- **Page-object keyword resource** (`resources/keywords/<screen>.page.resource`) — a `*** Keywords ***` file that imports the locator resource and wraps screen interactions as named business keywords.

Test suites must interact with the app **only** through page-object keywords — never raw AppiumLibrary keywords or inline locator strings.

# Inputs
- `platform` — `android` or `ios`
- `execution_target` — `local` (Android Studio emulator/AVD, physical device, or iOS simulator via a local Appium server) or `browserstack` (BrowserStack App Automate cloud)
- `appium_server_url` (local) / `browserstack.hub_url` (browserstack)
- `app_auth_strategy` — `none` or `env-var`
- `app_package` / `app_activity` (Android) or `bundle_id` (iOS) or `app_path` (local); `browserstack.app_id` (`bs://<hash>`) for BrowserStack
- `avd` — optional Android Studio AVD to auto-launch (local + android)
- `target_screens` — list of screen names / feature areas to analyze (derived from test scenarios if not supplied)

# Prerequisites
- **Local:** a running Appium server reachable at `appium_server_url`, plus a connected Android Studio emulator/AVD, physical device, or iOS simulator with the app installed (or `app_path` provided).
- **BrowserStack:** valid `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY`, an uploaded app (`browserstack.app_id`, `bs://<hash>`), and a selected `browserstack.device` + `browserstack.os_version`. The session opens against `browserstack.hub_url` with `bstack:options`.
- Appium capabilities resolvable from the config/env (`EXECUTION_TARGET`, `MOBILE_PLATFORM`, `DEVICE_NAME`, `AVD`, `PLATFORM_VERSION`, `AUTOMATION_NAME`, `APP_PACKAGE`/`APP_ACTIVITY`/`BUNDLE_ID`/`APP_PATH`, and the `BROWSERSTACK_*` / `BS_*` set).

# Inspection method
Appium has no dedicated MCP browser tool. Inspect the live app deterministically using one of:
- The Appium **page source** (`driver.page_source` / AppiumLibrary `Log Source` / `Get Source`) captured via a short inline Python or Robot snippet.
- **Appium Inspector** for interactive exploration when a human is in the loop.
- The accessibility hierarchy dumped from the device.

Capture the UI hierarchy for each screen **before** writing any locator; never guess selectors from memory.

# Actions
1. Start an Appium session using the resolved capabilities (**local**: `appium_server_url` with the device/AVD; **browserstack**: `browserstack.hub_url` with `bstack:options` + `app_id`); land on the app's first screen.
2. If `app_auth_strategy` is `env-var`, log in with `APP_USERNAME` / `APP_PASSWORD` before analyzing protected screens.
3. For each target screen:
   a. Capture the UI hierarchy (page source / accessibility tree).
   b. Extract every interactive element: text fields, buttons, tabs, toggles, switches, pickers, list rows, icons.
   c. Assign a locator strategy in priority order:
      - **Android:** `accessibility_id` (content-desc) → `id` (resource-id) → `-android uiautomator` → relative `xpath`.
      - **iOS:** `accessibility_id` → `-ios predicate string` / `-ios class chain` → relative `xpath`.
   d. Name each locator variable `UPPER_SNAKE_CASE` as `<SCREEN>_<ELEMENT>_<TYPE>` (e.g. `${LOGIN_USERNAME_INPUT}`, `${LOGIN_SUBMIT_BUTTON}`).
   e. Group locators by logical function within the screen (form, navigation, list, dialog).
   f. Derive page-object keyword signatures from the screen's user flows: `Open <Screen>`, `Enter <Field>`, `Tap <Action>`, `Get <Value>`, `Verify <State>`.
   g. Derive the page-object resource/keyword names from the screen title in Title Case.
4. Identify shared component patterns reused across screens (nav bar, tab bar, toasts, loading spinners, permission dialogs) → emit as `shared-components.locators.resource`.
5. Record screen identity signals (a unique element, header text, or activity) for `Verify <Screen> Is Displayed` assertions.
6. Never submit forms, complete purchases/payments, click destructive actions, or mutate application state during analysis.

# Step 0 — Analyze Local Project Structure (mandatory, always first)
Before any Appium inspection, scan the auto-derived project root (repository/workspace root containing `.github`, or `target_local_path` override) to detect existing conventions so generation conforms to them:
- Locate `robot.yaml` / an existing tests root; record the test root, `resources/locators`, `resources/keywords`, `resources/config`, `tests/`, `libraries/` layout and file naming.
- Read 1–2 representative files per layer to capture conventions (variable naming, keyword documentation style, logging style, screenshot path pattern, capability bootstrap).
- Record existing locator variables, page-object keywords, and suites so downstream steps **reuse and extend** them in place rather than duplicate.
- Emit `project_structure`; if no Robot Framework project is found, mark `detected = false` and fall back to the default layout under `test_output_path`.

# Outputs
- `project_structure` — detected local layout + conventions (test root, folder names, naming, config path, existing files)
- `screen_definitions` — one entry per screen:
  ```json
  {
    "screen_name": "LoginScreen",
    "locator_resource": "resources/locators/login.locators.resource",
    "page_resource": "resources/keywords/login.page.resource",
    "locators": { "LOGIN_USERNAME_INPUT": "accessibility_id=username", "LOGIN_SUBMIT_BUTTON": "accessibility_id=Sign in" },
    "keywords": ["Open Login Screen", "Enter Username", "Enter Password", "Submit Login Form", "Get Error Message"],
    "screen_identity": "accessibility_id=login-header"
  }
  ```
- `shared_component_locators` — locators for recurring components shared across screens
- `auth_pattern` — detected login flow, credential fields, and post-login screen identity
- `locator_conventions` — preferred strategy hierarchy applied during analysis
- `navigation_patterns` — tab/stack navigation behaviour, loader/spinner locators
- `analysis_warnings` — screens that could not be reached or captured
