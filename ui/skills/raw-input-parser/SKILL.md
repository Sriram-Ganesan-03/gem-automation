---
name: raw-input-parser
description: "Use when input_source is raw-file. Parses a local markdown, plain-text, or JSON file into the same normalized test_scenarios[] shape produced by ado-testcase-parser, so all downstream POM generation phases work identically regardless of input source."
---

# Goal
Convert a raw local input file into structured scenario payloads shaped identically to `ado-testcase-parser` output — so `build-tests-from-ado` Phases 2–5 require no changes regardless of `input_source`.

# Inputs
- `raw_input_file` — path to the file (relative to workspace root or absolute). Supported extensions: `.md`, `.txt`, `.json`.
- `spec_name_override` (optional) — if supplied, used as `story_title` when the file does not contain one.

# Supported File Formats

## 1 — Markdown (`.md`)
Headings and bullet/numbered lists are the canonical structure.

```markdown
# Story Title: User Login

## Test Case: Valid credentials login
**Steps:**
1. Navigate to the login page
2. Enter a valid username in the username field
3. Enter a valid password in the password field
4. Click the Submit button

**Expected Result:** User is redirected to the dashboard page.

---

## Test Case: Invalid credentials shows error
**Steps:**
1. Navigate to the login page
2. Enter an invalid username
3. Enter a wrong password
4. Click the Submit button

**Expected Result:** An error message "Invalid credentials" is displayed.
```

Parsing rules:
- First `# ` heading (or `# Story Title:` prefix) → `story_title`.
- Each `## Test Case:` (or `## TC:`) heading starts a new scenario.
- Numbered or bulleted items under `**Steps:**` (or `### Steps`) → `steps[]`.
- Content after `**Expected Result:**` (or `### Expected Result`) → `expected_result`.
- A `**Test Data:**` (or `### Test Data`) block is parsed as key-value pairs → `test_data{}`.
- Each step text is examined for locator hints: words like "button", "field", "input", "link", "dropdown", "checkbox" trigger locator hint extraction.

## 2 — Plain Text (`.txt`)
Same structure as Markdown but without formatting syntax. Heading lines are identified by capitalisation or a trailing colon pattern.

```
Story: User Login

Test Case: Valid credentials login
Steps:
1. Navigate to the login page
2. Enter a valid username
3. Enter a valid password
4. Click Submit
Expected Result: Redirected to dashboard.

Test Case: Invalid credentials shows error
Steps:
1. Navigate to the login page
2. Enter invalid username
3. Enter wrong password
4. Click Submit
Expected Result: Error message shown.
```

Parsing rules mirror Markdown except heading detection uses line patterns:
- Line starting with `Story:` or `Story Title:` → `story_title`.
- Line starting with `Test Case:` or `TC:` → new scenario.
- Line starting with `Steps:` → begin step list.
- Line starting with `Expected Result:` → `expected_result`.

## 3 — Structured JSON (`.json`)
Pre-formatted payload matching the output schema exactly (or a subset of it).

```json
{
  "story_title": "User Login",
  "test_scenarios": [
    {
      "title": "Valid credentials login",
      "steps": [
        { "action": "Navigate to the login page", "locator_hints": ["loginPage"] },
        { "action": "Enter a valid username", "locator_hints": ["usernameInput"] },
        { "action": "Click Submit", "locator_hints": ["submitButton"] }
      ],
      "expected_result": "Redirected to dashboard",
      "test_data": {}
    }
  ]
}
```

Parsing rule: if `story_title` and `test_scenarios` keys are present, return the structure directly after schema validation. Missing optional fields default to empty strings/objects.

# Locator Hint Extraction (Markdown and Plain Text)
When parsing free-text steps, extract locator hints by scanning for:
- Element type words: `button`, `field`, `input`, `link`, `dropdown`, `select`, `checkbox`, `radio`, `textarea`, `table`, `row`, `cell`
- Quoted strings: `"Submit"`, `'username'` → likely display names or labels
- `data-testid` patterns if present inline

Map extracted hints to camelCase locator candidates (e.g., "Submit button" → `submitButton`, "username field" → `usernameInput`). These become `locator_hints[]` on each step, feeding into `build-tests-from-ado` Phase 2–3 page class generation.

# Outputs
Identical shape to `ado-testcase-parser`:

```json
{
  "story_title": "string",
  "test_scenarios": [
    {
      "title": "string",
      "steps": [
        { "action": "string", "locator_hints": ["string"] }
      ],
      "expected_result": "string",
      "test_data": {}
    }
  ],
  "conversion_warnings": ["string"]
}
```

# Error Handling
- If the file cannot be read: add a `conversion_warning` and return an empty `test_scenarios[]`.
- If the file format cannot be detected: attempt all three parsers in order (JSON → Markdown → Plain Text); use the first that produces at least one scenario.
- If no `story_title` can be derived and `spec_name_override` is not supplied: use the filename (without extension) as `story_title` and add a `conversion_warning`.
- If a scenario has no steps: include it with an empty `steps[]` and add a `conversion_warning` naming the scenario.

# Actions
1. Read `raw_input_file` from disk.
2. Detect format by extension; fall back to content sniffing.
3. Parse into `test_scenarios[]` using the rules above.
4. Normalise each step's `action` string and extract `locator_hints`.
5. Return the output payload.
