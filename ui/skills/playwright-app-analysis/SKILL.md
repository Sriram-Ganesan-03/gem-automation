---
name: playwright-app-analysis
description: "Use when navigating a live application with Playwright MCP to discover page structure, POM class definitions, object repository locators, auth patterns, and interaction conventions needed for test generation."
---

# Goal
Analyze the target web application by navigating it with Playwright MCP and produce Page Object Model (POM) definitions: one locator set and one page class blueprint per page, plus shared component patterns.

# POM Output Structure
Every page analyzed produces two artifacts:
- **Locator file** (`locators/<page-name>.locators.ts`) — pure constant exports, no Playwright imports, used as the Object Repository.
- **Page class blueprint** (`pages/<page-name>.page.ts`) — TypeScript class that imports from the locator file and wraps page interactions as named action methods.

Specs must only interact with the app through page class methods — never inline `page.locator()` or `page.getByRole()` calls.

# Inputs
- `app_base_url`
- `app_auth_strategy` — one of `none`, `env-var`, `cookie-file`
- `target_pages` — list of URL paths or feature areas to analyze (derived from test scenarios if not supplied)

# Prerequisites
- `APP_BASE_URL` is set.
- Playwright MCP tools are available (`mcp_playwright_browser_navigate`, `mcp_playwright_browser_snapshot`, etc.).

# Actions
1. Navigate to `app_base_url` and take a DOM snapshot via `mcp_playwright_browser_snapshot`.
2. If `app_auth_strategy` is `env-var`, read `APP_USERNAME` / `APP_PASSWORD` and perform login before analyzing protected pages.
3. For each target page:
   a. Navigate and snapshot the DOM.
   b. Extract all interactive elements: inputs, buttons, links, selects, checkboxes.
   c. Assign locator expressions using priority: `data-testid` → ARIA role + name → label → placeholder → CSS.
   d. Group locators by logical function (e.g., `form`, `navigation`, `table`, `modal`).
   e. Name each locator as a `camelCase` constant matching its semantic purpose (e.g., `submitButton`, `usernameInput`, `errorMessage`).
4. Identify shared component patterns reused across pages (modals, toasts, data tables, breadcrumbs, loading spinners) — emit as a `shared-components.locators.ts` entry.
5. Derive page class name from page title/route in `PascalCase` suffixed with `Page` (e.g., `LoginPage`, `DashboardPage`).
6. For each page class, define action method signatures derived from the page's user flows: `goto()`, `fill*()`, `click*()`, `get*()`, `waitFor*()`.
7. Record URL patterns for `expect(page).toHaveURL()` assertions.
8. Never submit forms, click destructive actions, or mutate application state during analysis.

# Outputs
- `page_definitions` — one entry per page:
  ```
  {
    "page_name": "LoginPage",
    "route": "/login",
    "page_title": "string",
    "locator_file": "locators/login.locators.ts",
    "page_file": "pages/login.page.ts",
    "locators": { "camelCaseName": "selector-expression" },
    "action_methods": ["goto()", "fillUsername(value)", "fillPassword(value)", "clickLogin()", "getErrorMessage()"],
    "url_pattern": "string"
  }
  ```
- `shared_component_locators` — locators for recurring components shared across pages
- `auth_pattern` — detected login flow, credential fields, and post-login URL
- `locator_conventions` — preferred selector hierarchy applied during analysis
- `navigation_patterns` — SPA routing behaviour, loader/spinner selectors
- `analysis_warnings` — pages that could not be reached or snapshotted
