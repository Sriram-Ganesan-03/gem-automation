---
applyTo: ".github/mobile/agents/**/*.md"
description: "Use when authoring or executing Robot Framework + Appium mobile automation agents for ADO test case conversion workflows."
---

# Required Input Contract
Every workflow run must include:
- `platform` (`android` | `ios`)
- `execution_target` (`local` | `browserstack`)
- `appium_server_url` (local) or the `browserstack` object (browserstack)
- `app_auth_strategy`
- `test_output_path`
- `input_source`
- `run_mode`

Conditionally required:
- `app_package` (+ optional `app_activity`) or `app_path` — when `platform` is `android` **and** `execution_target` is `local`
- `bundle_id` or `app_path` — when `platform` is `ios` **and** `execution_target` is `local`
- `browserstack.device`, `browserstack.os_version`, and `browserstack.app_id` (or `browserstack.app_path_upload`) — when `execution_target` is `browserstack`
- `user_story_ado_link`, `test_cases_ado_link` — when `input_source` is `ado`
- `raw_input_file` — when `input_source` is `raw-file`
- `reviewer_ado_user_id`, `target_repo`, `target_branch`, `execution_confirmation` — when `run_mode` is `execute`

# Runtime Requirements
- **Local (`execution_target=local`):** a running Appium server reachable at `appium_server_url`, plus a connected Android Studio emulator/AVD, physical device, or iOS simulator. The mobile app must be installed (or `app_path` provided). Appium auto-launches `avd` when set.
- **BrowserStack (`execution_target=browserstack`):** valid `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY`, an uploaded app (`browserstack.app_id`, `bs://<hash>`), and a selected `browserstack.device` + `browserstack.os_version`. The session opens against `browserstack.hub_url`.
- ADO extraction uses `ADO_PAT`, `ADO_ORG`, and `ADO_PROJECT`.
- Execute mode requires `execution_confirmation=APPROVED_EXECUTE`.
- ADO access mode must be `read-only`.
- ADO tool call mode must be `read-wrapper-only`.
- ADO write tools must be disabled (`ado_write_tools_disabled=true`).

# Execution Rules
1. Execute in this order only: analyze-app → build-tests → (optional heal-tests) → create-pr.
2. Do not skip app analysis before test generation.
3. Do not create a PR if the build step produced zero test suites (`.robot`) or zero page-object keyword files.
4. Ensure the reviewer is assigned by ADO user ID.
5. Default to `run_mode=dry-run`; require an explicit switch for execute.
6. Do not perform ADO write operations outside of PR creation and branch creation in execute mode.
7. Do not create probe resources (`_probe-*`) in the application or ADO.
8. Do not submit forms, trigger destructive actions, complete purchases/payments, or mutate application/back-office state during analysis.
9. On any unintended mutation, stop and request user direction before continuing.
10. Allowed ADO operations are read-only for work item/test case access; branch + PR writes are permitted only in execute mode.
11. Before every ADO tool/API call, run `mobile/scripts/assert-ado-operation.ps1 -Operation <tool_name>`.
12. If the assertion fails, do not call the endpoint; stop and ask user direction.

# Page Object Model (keyword-driven) Rules
These rules are mandatory for all generated files.

## Agent Persona (mandatory mindset)
Approach every task as **both a senior SDET and an Expert Mobile Automation QA Architect**. In addition to writing clean, idiomatic Robot Framework and Python, reason about test strategy and quality engineering:
- **Test architecture:** Design for maintainability, reusability, and scale — layer concerns (locators → page-object keywords → test suites → config), and choose abstractions that keep the suite resilient as the app grows.
- **Coverage & risk:** Think about what to test and why — happy paths, negative/edge cases, boundary conditions, permission dialogs, offline/slow-network states, and high-risk flows. Map generated tests back to the ADO test case intent, not just literal steps.
- **Stability & flakiness:** Proactively eliminate flakiness with explicit waits (`Wait Until Element Is Visible`), stable locators, and isolated, independent tests. Never rely on implicit timing or fixed sleeps.
- **Traceability & reporting:** Ensure every test is traceable to its ADO test case ID via `[Tags]` and produces clear, debuggable output (step logs, screenshots per workflow input).
- **Trade-off judgment:** Balance thoroughness against maintenance cost. Prefer a focused, reliable suite over brittle exhaustive coverage, and flag gaps with `# TODO:` notes rather than guessing.

## Layered Structure (mandatory)
| Layer | Folder | File pattern | Responsibility |
|---|---|---|---|
| Object Repository | `resources/locators/` | `<screen>.locators.resource` | Pure `*** Variables ***` — one `${SCREEN_ELEMENT}` locator variable per element. No AppiumLibrary keyword calls. |
| Page Objects | `resources/keywords/` | `<screen>.page.resource` | `*** Keywords ***` that import the screen's locator resource and wrap every interaction as a business keyword. |
| Config | `resources/config/` | `common.resource`, `capabilities.resource` | Suite setup/teardown, Appium session bootstrap, shared variables read from env vars. |
| Test Suites | `tests/` | `<story-kebab>.robot` | `*** Test Cases ***` that call page-object keywords only. Never contain raw locators or AppiumLibrary keywords. |
| Custom Libraries | `libraries/` | `<Name>.py` | Optional Python helpers (data builders, version-scoped locator resolver, custom logic) when RF keywords are insufficient. |

## Object Repository (`resources/locators/`)
- Every screen analysed must produce a `resources/locators/<screen>.locators.resource` file.
- Locator files contain a single `*** Variables ***` section — no `*** Keywords ***`, no AppiumLibrary imports.
- Locator variable names are `UPPER_SNAKE_CASE`, prefixed with the screen name and suffixed with the element type (e.g. `${LOGIN_USERNAME_INPUT}`, `${LOGIN_SUBMIT_BUTTON}`, `${LOGIN_ERROR_LABEL}`).
- Shared locators reused across screens go into `resources/locators/shared-components.locators.resource`.
- Each value is an Appium locator string using an explicit strategy: `accessibility_id=`, `id=`, `xpath=`, `class=`, `-android uiautomator=`, `-ios predicate string=`, or `-ios class chain=`.

### Locator Discovery & Verification (mandatory when reading locators from the app)
When deriving locators from the live app, follow this procedure for **every** locator — never guess selectors from memory or assumption:
1. Capture the current UI hierarchy first (Appium `page_source`, Appium Inspector, or the accessibility tree) before writing any locator.
2. Prioritize locator strategies in this order:
   - **Android:** `accessibility_id` (content-desc) → `id` (resource-id) → `-android uiautomator` → `xpath` (relative, attribute-anchored) as a last resort.
   - **iOS:** `accessibility_id` → `-ios predicate string` / `-ios class chain` → `xpath` (relative) as a last resort.
   When `strategy` is `id-first`, prefer `id`/`name` first, then accessibility, then the platform query strategies, then xpath.
3. Use XPath only when a complex hierarchy makes the strategies above impossible:
   - Always write **relative** XPaths anchored on specific attributes (e.g. `//android.widget.Button[@content-desc='Sign in']`).
   - Never use brittle **absolute** XPaths from the root.
   - Add a comment explaining why XPath was required.
4. Verify each locator uniquely matches **exactly one element (1-of-1)** on the live app before committing it to the locator resource.
5. If a locator cannot be verified as 1-of-1, refine it (add attributes, scope to a parent container) until unique, or add a `# TODO:` note flagging it for manual verification.
6. **Ambiguous match — ask the user (mandatory):** When an element resolves to two or more matching nodes on the same screen, stop and ask the user to choose the exact element. Present each candidate with context (class, accessible name/label, visible text, index, proposed selector). Do not guess or silently pick the first match. If the user cannot decide, add a `# TODO:` note rather than committing an ambiguous locator.

### Version-Scoped Locators (mandatory for version-aware validation & healing)
A locator value may be **either** a plain locator string (version-agnostic — the default) **or** a version-scoped mapping when the same element is targeted differently across app builds. This exists so that runs against an older app build keep using the old selector and runs against a newer build use the new one — healing must never destroy a still-valid older selector.

- Plain (default): `${LOGIN_SUBMIT_BUTTON}    accessibility_id=Sign in`
- Version-scoped values are stored in `libraries/version_locators.py` as a mapping keyed by locator name → newest-first list of `{ since, selector }`, and resolved through the `Resolve Locator` keyword (backed by `libraries/VersionLocators.py`) which selects the entry with the highest `since` that is `<= ${APP_VERSION}`.
- `resources/config/common.resource` must expose `${APP_VERSION}` sourced from the `APP_VERSION` env var (default `0.0.0`). `APP_VERSION` is read only in the config layer.
- **Healing must be additive across versions:** when a selector breaks only because the app was upgraded, keep the old selector under its prior `since` and add the new healed selector under the new app version. Never delete or overwrite a selector that still resolves 1-of-1 on an older supported build.

## Page Objects (`resources/keywords/`)
- Every screen analysed must produce a `resources/keywords/<screen>.page.resource` file.
- Page-object resources `Resource` the corresponding `resources/locators/<screen>.locators.resource` and `resources/config/common.resource`.
- Keyword names are Title Case business actions describing **what** the user does, not how Appium does it (e.g. `Enter Username`, `Submit Login Form`, `Get Error Message`) — never `Click Element By Id`.
- Every interaction inside a keyword must reference a locator **variable** — no inline locator strings.
- Always wait for an element before interacting (`Wait Until Element Is Visible    ${LOCATOR}`) — never assume readiness.
- Each keyword must have a `[Documentation]` line stating the action, the locator variable used, and any preconditions.
- **When `log_level` is `action` or `step`:** add `Log    [<Screen>] <Keyword> — start` as the first step and `Log    [<Screen>] <Keyword> — done` as the last step of every keyword.
- Complex multi-step interactions (fill + tab + assert) are encapsulated in a single named keyword, not spread across test steps.

## Test Suites (`tests/`)
- Test suites `Resource` the page-object keyword files and `resources/config/common.resource` — never `Resource` a locator file directly.
- Raw AppiumLibrary keywords (`Click Element`, `Input Text`, `Tap`, `Swipe`, `Wait Until Element Is Visible`, `Element Should Be Visible`, `Get Text`, etc.) and raw locator strategy strings are **forbidden** in test suites.
- Every `Test Case` maps to one ADO test case and is annotated with its ADO test case ID via `[Tags]    ADO-TC-<id>` (and `[Tags]    ADO-Story-<id>` at suite level via `Force Tags` / `Default Tags`). In `raw-file` mode, tag with the source file name and scenario title instead.
- All suites define `Suite Setup` (open the Appium session + optional login) and `Suite Teardown` (close the app / driver) via keywords from `resources/config/common.resource`.
- Wrap each logical action of a test case as its own line calling a page-object keyword; keep assertions in dedicated `... Should ...` page-object keywords.
- **Never embed literal host/URL, username, password, device secrets, or PII (patron names, account/card/loyalty numbers, emails, phone numbers, DOBs, government IDs, payment details) in test/keyword names, `Log` messages, tags, or screenshot file names.** Describe the action generically and reference its source — e.g. `Enter The Admin Username (from config)`, `Search For The Patron (from test data)`. Pull all such values from `resources/config/common.resource` variables (which read env vars) or a `resources/config/test-data.resource`. Never hardcode credentials or PII in any generated file.
- **When `log_level` is `step` or `action`:** add `Log    ▶ <step description>` as the first line of each test-case step grouping.
- **When `screenshot_mode` is `all`:** call `Capture Page Screenshot    ${SCREENSHOT_DIR}/<kebab-test>-<kebab-step>.png` at the end of each step.
- **When `screenshot_mode` is `on-failure`:** rely on AppiumLibrary's `Register Keyword To Run On Failure    Capture Page Screenshot` set in suite setup; add no inline screenshots.
- **When `screenshot_mode` is `none`:** add no screenshots and do not register the failure hook.

## Naming Conventions
- Locator variables: `UPPER_SNAKE_CASE` — `<SCREEN>_<ELEMENT>_<TYPE>` (e.g. `${LOGIN_USERNAME_INPUT}`).
- Keywords: Title Case imperative business actions (e.g. `Enter Username`, `Submit Login Form`, `Verify Dashboard Is Displayed`).
- Test cases: plain-English sentences (e.g. `Logs In With Valid Credentials`).
- Suite file names: kebab-case matching the story title (e.g. `user-login.robot`).

## Type Safety & Robustness (Python libraries)
- Custom Python libraries under `libraries/` must use type hints on all function signatures and return types.
- Never hardcode credentials, URLs, or environment-specific values — read them from environment variables or receive them as keyword arguments.
- Add a `# TODO:` comment where a locator hint could not be derived from app analysis and manual verification is recommended.
