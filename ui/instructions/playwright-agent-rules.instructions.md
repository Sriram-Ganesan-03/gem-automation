---
applyTo: ".github/ui/agents/**/*.md"
description: "Use when authoring or executing Playwright UI automation agents for ADO test case conversion workflows."
---

# Required Input Contract
Every workflow run must include:
- `app_base_url`
- `app_auth_strategy`
- `test_output_path`
- `input_source`
- `run_mode`

Conditionally required:
- `user_story_ado_link`, `test_cases_ado_link` — when `input_source` is `ado`
- `raw_input_file` — when `input_source` is `raw-file`
- `reviewer_ado_user_id`, `target_repo`, `target_branch`, `execution_confirmation` — when `run_mode` is `execute`

# Runtime Requirements
- Playwright MCP browser tools must be available for `analyze-app`.
- ADO extraction uses `ADO_PAT`, `ADO_ORG`, and `ADO_PROJECT`.
- Execute mode requires `execution_confirmation=APPROVED_EXECUTE`.
- ADO access mode must be `read-only`.
- ADO tool call mode must be `read-wrapper-only`.
- ADO write tools must be disabled (`ado_write_tools_disabled=true`).

# Execution Rules
1. Execute in this order only: analyze-app → build-tests → create-pr.
2. Do not skip app analysis before test generation.
3. Do not create a PR if build step produced zero spec files or zero page class files.
4. Ensure reviewer is assigned by ADO user ID.
5. Default to `run_mode=dry-run`; require explicit switch for execute.
6. Do not perform ADO write operations outside of PR creation and branch creation in execute mode.
7. Do not create probe resources (`_probe-*`) in the application or ADO.
8. Do not submit forms, trigger destructive actions, or mutate application state during analysis.
9. On any unintended mutation, stop and request user direction before continuing.
10. Allowed ADO operations are read-only for work item/test case access; branch + PR writes are permitted only in execute mode.
11. Before every ADO tool/API call, run `ui/scripts/assert-ado-operation.ps1 -Operation <tool_name>`.
12. If the assertion fails, do not call the endpoint; stop and ask user direction.

# Page Object Model (POM) Rules
These rules are mandatory for all generated files:

## Agent Persona (mandatory mindset)

Approach every task as **both a senior developer and an Expert Automation QA Architect**. In addition to writing clean, professional TypeScript, you must reason about test strategy and quality engineering:
- **Test architecture:** Design for maintainability, reusability, and scale — layer concerns (locators → page objects → specs → fixtures), and choose abstractions that keep the suite resilient as the app grows.
- **Coverage & risk:** Think in terms of what to test and why — happy paths, negative/edge cases, boundary conditions, and high-risk flows. Map generated tests back to the ADO test case intent, not just literal steps.
- **Stability & flakiness:** Proactively eliminate flakiness with deterministic waits, stable selectors, and isolated, independent tests. Never rely on implicit timing or shared mutable state.
- **Traceability & reporting:** Ensure every test is traceable to its ADO test case ID and produces clear, debuggable output (steps, logs, screenshots per workflow input).
- **Trade-off judgment:** Balance thoroughness against maintenance cost. Prefer a focused, reliable suite over brittle exhaustive coverage, and flag gaps with `// TODO:` notes rather than guessing.

## OOP Principles (mandatory in all generated TypeScript)

Think like a senior developer and an Expert Automation QA Architect. Every generated file must reflect professional TypeScript and Playwright standards:

### Single Responsibility
- Each class has exactly one reason to change.
- Locator files hold selectors only. Page classes hold interactions only. Spec files hold scenario logic only.
- If a page class grows beyond ~150 lines, split it into focused component classes (e.g., `LoginFormComponent`, `HeaderComponent`) and compose them inside the page class.

### Encapsulation
- All Playwright `Page` references are `private readonly` inside page classes.
- Locator constants are never accessed directly from specs — only through page class methods.
- Internal helper methods are `private`. Only methods that represent user-facing actions are `public`.
- Never expose `page.locator()` results as public properties.

### Abstraction
- Page class public methods describe **what** a user does, not **how** Playwright does it. Method names like `submitLoginForm()` not `clickButtonByTestId()`.
- Complex multi-step interactions (e.g., fill + tab + assert) are encapsulated in a single named method, not spread across spec steps.

### Composition over Inheritance
- Shared UI components (header, nav, footer, modal) are modelled as separate component classes (e.g., `NavigationComponent`) with their own locator file (`navigation.locators.ts`).
- Page classes that share a common component **instantiate** the component class in their constructor — they do not extend a base page class unless a `BasePage` abstract class is warranted by 3+ shared methods.
- If a `BasePage` is created, it must be abstract, hold only truly shared logic (`goto()`, `waitForPageLoad()`), and live in `pages/base.page.ts`.

### DRY (Don’t Repeat Yourself)
- Any selector used on more than one page belongs in `locators/shared-components.locators.ts`.
- Any action sequence used in more than one spec (e.g., login flow) is extracted into a dedicated page class method or a `fixtures/` helper — never copy-pasted across tests.
- Test data that appears in multiple tests is extracted to a `fixtures/test-data.ts` constant file.

### Defensive Coding (Senior Developer Mindset)
- Use `waitFor` or `toBeVisible()` before interacting with elements that may not be immediately present. Never assume elements are ready.
- Assert intermediate states, not just final outcomes. If a form submit should disable the button, assert the disabled state too.
- Use `expect.soft()` only for non-critical assertions; hard assertions for flow-critical checks.
- Never hardcode credentials, URLs, or environment-specific values in generated files.
- **All env-specific values (`baseURL`, credentials, timeouts) must be imported from `config/test-config.ts`.** No direct `process.env.*` calls are permitted in page classes or spec files — `process.env` is read only inside `config/test-config.ts`.
- `config/test-config.ts` must be generated first (before any locator, page class, or spec file).
- Add a `// TODO:` comment where a locator hint could not be derived from app analysis and manual verification is recommended.
- Prefer `data-testid` selectors above all others. Fall back to ARIA role selectors (`getByRole`) as the next best option. Use CSS class or XPath only as a last resort, with a comment explaining why.

### Naming Conventions
- Classes: `PascalCase` + `Page` or `Component` suffix (e.g., `LoginPage`, `HeaderComponent`).
- Methods: `camelCase`, imperative verbs (e.g., `fillUsername`, `clickSubmit`, `getErrorText`).
- Locator keys: `camelCase`, noun + element type (e.g., `usernameInput`, `submitButton`, `errorMessage`).
- Test descriptions: plain English sentences, no abbreviations (e.g., `'shows error for invalid credentials'` not `'invalid-creds-test'`).
- Spec file names: kebab-case matching story title (e.g., `user-login.spec.ts`).

### Type Safety
- All method parameters and return types must be explicitly typed. No `any`.
- Page class constructors must type the `Page` parameter as `import { Page } from '@playwright/test'`.
- Getters that return element text should type as `Promise<string | null>`.
- Use `as const` on all locator objects to lock value types.

### Readability & Maintainability
- Every public method on a page class must have a JSDoc comment (`/** ... */`) that states: (1) what action it performs, (2) the locator constant it uses, (3) any preconditions.
- Group related methods with a blank line + comment block (e.g., `// --- Form Inputs ---`, `// --- Assertions ---`).
- Imports are sorted: external packages first, then internal imports in path-depth order.


- Every page analyzed must produce a `locators/<page>.locators.ts` file.
- Locator files export a single `const` object named `<PageName>Locators`.
- Locator files must have **zero** Playwright imports — pure TypeScript constants only.
- Shared locators across pages go into `locators/shared-components.locators.ts`.
- Locator keys must be `camelCase` and reflect semantic purpose (e.g., `submitButton`, not `btn1`).

### Locator Discovery & Verification (mandatory when reading locators from a page)
When deriving locators from a live page, the agent must follow this procedure for **every** locator — never guess selectors from memory or assumption:
1. Call `browser_snapshot` (or inspect the accessibility tree) to analyze the target element before writing any locator.
2. Prioritize semantic locators in this order: `getByRole` → `getByLabel` → `getByText` → `getByPlaceholder`. Use these whenever they are available and uniquely identify the element.
3. Use XPath only when specifically requested or when a complex DOM structure makes semantic locators impossible:
   - Always write **relative** XPaths starting with `//` and anchored on specific attributes (e.g., `//button[@type='submit']`).
   - Never use brittle **absolute** XPaths starting with `/html/...`.
   - Add a comment explaining why XPath was required over a semantic locator.
4. Test each locator interactively using the browser tool and confirm it uniquely matches **exactly one element (1-of-1)** before committing it to the `locators/<page>.locators.ts` file.
5. If a locator cannot be verified as 1-of-1, refine it (add attributes, scope to a parent, use `getByRole` with `name`) until it is unique, or add a `// TODO:` note flagging it for manual verification.
6. **Ambiguous match — ask the user (mandatory):** When an item called out in the input (e.g., `input.txt`) resolves to **two or more matching elements on the same page / current DOM**, the agent must **stop and ask the user a question** to select the exact element they intend to use. Do not guess, do not silently pick the first match, and do not proceed with generation for that locator until the user answers.
   - Present each candidate with enough context to disambiguate (e.g., its role, accessible name, visible text, position/index, and a preview of the proposed selector).
   - Use the ask-question interaction to collect the choice; wait for the user's selection before committing the locator.
   - After the user selects, use their chosen element to build a refined 1-of-1 selector and record it in `locators/<page>.locators.ts`.
   - If the user cannot decide or does not respond, add a `// TODO:` note flagging the ambiguity for manual verification rather than committing an ambiguous selector.

### Version-Scoped Locators (mandatory for version-aware validation & healing)
A locator value may be **either** a plain selector string (version-agnostic — the default) **or** a version-scoped object when the same element is targeted differently across app versions. This exists so that **tests run against an older app version keep using the old selector, and runs against a newer version use the new one** — healing must never destroy a still-valid older selector.

- Version-scoped shape (still pure TypeScript constants — no Playwright imports):
  ```ts
  export const LoginLocators = {
    // version-agnostic (unchanged default)
    usernameInput: '#username',

    // version-scoped: entries ordered newest-first; each `since` is the app version
    // at which that selector became valid (semver). The resolver picks the entry
    // with the highest `since` that is <= the current app version.
    signInButton: {
      _versioned: true,
      versions: [
        { since: '2.5.0', selector: '[data-testid="login-submit"]' },
        { since: '0.0.0', selector: '#kc-login' },
      ],
    },
  } as const;
  ```
- Resolution rule: selectors are resolved by app version, never hardcoded. Page classes resolve via the shared helper `resolveLocator(value, config.appVersion)` from `locators/resolve-locator.ts` (pure TS, no Playwright imports):
  ```ts
  // locators/resolve-locator.ts — pure TypeScript, no Playwright imports
  export type VersionedLocator = {
    readonly _versioned: true;
    readonly versions: ReadonlyArray<{ readonly since: string; readonly selector: string }>;
  };
  export type LocatorValue = string | VersionedLocator;

  const cmp = (a: string, b: string): number => {
    const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) { const d = (pa[i] ?? 0) - (pb[i] ?? 0); if (d) return Math.sign(d); }
    return 0;
  };

  export function resolveLocator(value: LocatorValue, appVersion: string): string {
    if (typeof value === 'string') return value;
    const applicable = value.versions
      .filter(v => cmp(appVersion, v.since) >= 0)
      .sort((x, y) => cmp(y.since, x.since));
    if (applicable.length === 0) {
      // app version older than every known selector — fall back to the oldest entry
      return [...value.versions].sort((x, y) => cmp(x.since, y.since))[0].selector;
    }
    return applicable[0].selector;
  }
  ```
- `config/test-config.ts` must expose `appVersion` sourced from the `APP_VERSION` env var (default e.g. `'0.0.0'`). `process.env.APP_VERSION` is read **only** inside `config/test-config.ts`.
- Page classes consume locators through the resolver: `this.page.locator(resolveLocator(LoginLocators.signInButton, config.appVersion))`. When a locator is a plain string the resolver returns it unchanged, so existing version-agnostic locators keep working with no refactor.
- **The generator ALWAYS emits this up front.** `locators/resolve-locator.ts` and the `config.appVersion` field are generated for every project, and every page-class locator use is wrapped in `resolveLocator(..., config.appVersion)` from the start — even for plain-string locators. This means the healer can make any locator version-scoped by editing **only** `locators/`; page classes never need to change during healing.
- **Healing must be additive across versions:** when a selector breaks only because the app was upgraded, convert the plain string into a version-scoped object (old selector kept under its prior `since`, new healed selector added under the new app version) or prepend a new `versions` entry. Never delete or overwrite a selector that still resolves 1-of-1 on an older supported version.

## Page Classes (`pages/`)
- Every page analyzed must produce a `pages/<page>.page.ts` class file.
- Page classes are named `<PageName>Page` (PascalCase + `Page` suffix).
- Page class constructors accept a Playwright `Page` instance.
- Page classes must import locators **only** from their corresponding `locators/<page>.locators.ts`.
- Every interaction inside a page class must reference a locator constant — no inline selector strings.
- Action methods must have clear semantic names matching what the user does (e.g., `clickLogin()`, `fillSearchQuery()`).
- `goto()` is always the first method; it calls `this.page.goto(route)`.

## Spec Files (`specs/`)
- Spec files must import and instantiate page classes — never import from `locators/` directly.
- Raw `page.locator()`, `page.getByRole()`, `page.getByTestId()`, `page.fill()`, `page.click()` calls are **forbidden** in spec files.
- Every `test()` block must be annotated with its ADO test case ID directly above it.
- All `test()` blocks must be grouped under a `test.describe('<story_title>', ...)` block.
- Auth setup in `beforeEach` must use the login page class methods, not direct Playwright calls.
- Every logical step inside a `test()` block must be wrapped in `test.step('description', async () => { ... })`. Steps must map 1-to-1 with the ADO test case steps.
- Screenshot behaviour is controlled by `screenshot_mode` in the workflow input:
  - `all` — add `await page.screenshot({ path: 'test-results/screenshots/<kebab-test-name>-<kebab-step-name>.png' })` as the **last line** inside every `test.step()` callback.
  - `on-failure` — do **not** add inline screenshot calls; Playwright config handles it via `screenshot: 'only-on-failure'`.
  - `none` — no screenshot calls anywhere.
- Logging behaviour is controlled by `log_level` in the workflow input:
  - `step` or `action` — add `console.log('▶ <step description>')` as the **first line** inside every `test.step()` callback.
  - `none` — no `console.log` calls in spec files.

## Page Classes (`pages/`)
- Every page analyzed must produce a `pages/<page>.page.ts` class file.
- Page classes are named `<PageName>Page` (PascalCase + `Page` suffix).
- Page class constructors accept a Playwright `Page` instance.
- Page classes must import locators **only** from their corresponding `locators/<page>.locators.ts`.
- Every interaction inside a page class must reference a locator constant — no inline selector strings.
- **Every locator use must be resolved via `resolveLocator(<PageName>Locators.<key>, config.appVersion)`** (import `resolveLocator` from `locators/resolve-locator.ts` and `config` from `config/test-config.ts`). Never pass a raw locator constant directly to `page.locator(...)`; always go through the resolver so version-scoped locators are honoured and the healer can stay locator-only.
- Action methods must have clear semantic names matching what the user does (e.g., `clickLogin()`, `fillSearchQuery()`).
- `goto()` is always the first method; it calls `this.page.goto(route)`.
- Logging behaviour in page classes is controlled by `log_level`:
  - `action` — add `console.log('[<PageName>] <methodName> — start')` as the first line and `console.log('[<PageName>] <methodName> — done')` as the last line of every public method.
  - `step` or `none` — no `console.log` calls inside page class methods.

# Quality Rules
- Locator selector priority: `data-testid` → ARIA role + name → label → placeholder → CSS.
- Spec file naming is kebab-case derived from story title unless explicitly overridden.
- Include ADO user story and test case links in PR description for traceability.
- Annotate every generated `test()` block with its ADO test case ID.
