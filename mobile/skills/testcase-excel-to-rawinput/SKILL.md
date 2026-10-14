---
name: testcase-excel-to-rawinput
description: "Use when input_source is raw-file and raw_input_file points at a Test Cases workflow output (an .xlsx workbook produced by excel-exporter, or the raw testcase-generator .json). Converts the ADO test-case layout into a raw-input .json (or .md) file shaped exactly like raw-input-parser input, so the Mobile workflow can consume Test Cases output with no ADO fetch."
---

# Goal
Bridge the **Test Cases workflow** output to the **Mobile workflow** raw-file branch. Read a Test Cases artifact and emit a file that `raw-input-parser` consumes directly — the same `story_title` + `test_scenarios[]` shape used by every downstream POM phase.

This makes "Test Cases Excel → Mobile tests" a single, supported flow: set `input_source: "raw-file"` and point `raw_input_file` at the `.xlsx` (or the testcase-generator `.json`). The build agent invokes this skill first, then feeds the produced `.json` into `raw-input-parser`.

# Inputs
- `source_file` — path to the Test Cases artifact. Supported: `.xlsx` (excel-exporter output) or `.json` (testcase-generator output).
- `output_format` (optional) — `json` (default) or `md`.
- `output_file` (optional) — target path. Default: same folder and basename as `source_file`, with `.rawinput.json` (or `.rawinput.md`) suffix.
- `story_title_override` (optional) — used as `story_title` when it cannot be derived from the source.
- `worksheet` (optional, `.xlsx` only) — worksheet to read. Default: first worksheet (typically `Test Cases`).

# Column Contract (excel-exporter canonical layout)
The excel-exporter emits an expanded ISTQB layout. The columns this converter relies on are read **by header name**, so any extra columns are tolerated. Recognised headers:
`Work Item Type, Test Case ID, Requirement ID, Test Condition, Scenario, Title, Type, Test Level, Technique, Category, Priority, Severity, Risk Rating, Automation Feasibility, State, Area Path, Assigned To, Preconditions, Test Step, Step Action, Expected Result, Test Data`

> Older workbooks may use the legacy 11-column layout (`Work Item Type, Title, State, Area Path, Assigned To, Type, Preconditions, Test Step, Step Action, Expected Result, Test Data`). Both are supported — the ISTQB-only columns are simply absent in the legacy shape.

Row pattern per test case (from `testcase-generator` / `excel-exporter`):
- **Title row** — `Title` filled, `Test Step` and `Step Action` blank. Carries the metadata columns (`Type`, `Preconditions`, `Test Data`, and the ISTQB fields when present).
- **Step rows 1..N-1** — only `Test Step` (index) and `Step Action` filled.
- **Last step row N** — `Test Step`, `Step Action`, and `Expected Result` filled.

# Mapping (Excel → raw-input `test_scenarios[]`)
- Title row `Title` → scenario `title`.
- Each `Step Action` row → one `steps[]` entry: `{ "action": "<Step Action>", "locator_hints": [] }`.
- The `Expected Result` on the last step row → scenario `expected_result`.
- `Test Data` (title row) → `test_data` object. Parse `key=value` / `key: value` pairs when present; otherwise store the raw string under `test_data.raw`.
- `Preconditions` (title row) → `test_data.preconditions` (preserved so the generator can honour setup steps).
- `Type` (Positive | Negative | Boundary) → `test_data.case_type`.
- **ISTQB metadata (when present)** → carried into `test_data` for traceability, without affecting POM generation: `Requirement ID` → `test_data.requirement_id`, `Test Condition` → `test_data.test_condition`, `Test Level` → `test_data.test_level`, `Technique` → `test_data.technique`, `Category` → `test_data.category`, `Priority` → `test_data.priority`, `Severity` → `test_data.severity`, `Risk Rating` → `test_data.risk_rating`, `Automation Feasibility` → `test_data.automation_feasibility`.
- `story_title` — derived in this order: `story_title_override` → the longest common title prefix across test cases (trimmed of trailing separators) → the workbook worksheet name → the source file basename.

Locator hints are intentionally left empty here; `raw-input-parser` and the POM phases already derive `locator_hints[]` from step text (words like "button", "field", "tab", quoted labels).

# Mapping (testcase-generator `.json` → raw-input)
When `source_file` is the `testcase-generator` JSON:
- `test_cases[].title` → scenario `title`.
- `test_cases[].steps[].action` → `steps[].action`.
- The last non-empty `steps[].expected_result` → scenario `expected_result`.
- `test_cases[].preconditions` → `test_data.preconditions`; `test_cases[].test_data` (string) → parsed pairs or `test_data.raw`; `test_cases[].type` → `test_data.case_type`.
- `story_title` — `story_title_override`, else derived from the common title prefix.

# Output schema (identical to raw-input-parser input / output)
```json
{
  "story_title": "string",
  "test_scenarios": [
    {
      "title": "string",
      "steps": [
        { "action": "string", "locator_hints": [] }
      ],
      "expected_result": "string",
      "test_data": {
        "preconditions": "string",
        "case_type": "Positive | Negative | Boundary",
        "raw": "string"
      }
    }
  ],
  "conversion_warnings": ["string"]
}
```
When `output_format` is `md`, emit the equivalent Markdown that `raw-input-parser` parses:
```markdown
# Story Title: <story_title>

## Test Case: <title>
**Steps:**
1. <action>
2. <action>

**Expected Result:** <expected_result>

**Test Data:**
- preconditions: <preconditions>
- case_type: <type>
```

# Execution method (AppLocker-safe — CRITICAL)
- **Do NOT create `.ps1` or `.py` files.** AppLocker blocks scripts in user-writable paths.
- Read `.xlsx` with the `ImportExcel` module **inline** via the run_in_terminal command parameter.
- Ensure the module is present: `if (-not (Get-Module -ListAvailable ImportExcel)) { Install-Module ImportExcel -Scope CurrentUser -Force }`.
- Avoid names colliding with PowerShell aliases (do not use `sl`, `gc`, `cd`).

## Reference inline conversion (`.xlsx` → `.json`)
```powershell
if (-not (Get-Module -ListAvailable ImportExcel)) { Install-Module ImportExcel -Scope CurrentUser -Force }
Import-Module ImportExcel
$src = '<source_file>'
$out = '<output_file>'
$rows = Import-Excel -Path $src   # add -WorksheetName '<worksheet>' when set
$scenarios = New-Object System.Collections.Generic.List[object]
$warnings  = New-Object System.Collections.Generic.List[string]
$current = $null
foreach ($r in $rows) {
  $title  = ("" + $r.Title).Trim()
  $step   = ("" + $r.'Step Action').Trim()
  $exp    = ("" + $r.'Expected Result').Trim()
  $tsIdx  = ("" + $r.'Test Step').Trim()
  if ($title -and -not $tsIdx -and -not $step) {
    if ($current) { $scenarios.Add($current) }
    $td = [ordered]@{}
    $pre = ("" + $r.Preconditions).Trim()
    if ($pre) { $td.preconditions = $pre }
    $type = ("" + $r.Type).Trim()
    if ($type) { $td.case_type = $type }
    foreach ($m in @(
      @{ col = 'Requirement ID';         key = 'requirement_id' },
      @{ col = 'Test Condition';          key = 'test_condition' },
      @{ col = 'Test Level';              key = 'test_level' },
      @{ col = 'Technique';               key = 'technique' },
      @{ col = 'Category';                key = 'category' },
      @{ col = 'Priority';                key = 'priority' },
      @{ col = 'Severity';                key = 'severity' },
      @{ col = 'Risk Rating';             key = 'risk_rating' },
      @{ col = 'Automation Feasibility';  key = 'automation_feasibility' }
    )) {
      if ($r.PSObject.Properties.Name -contains $m.col) {
        $val = ("" + $r.($m.col)).Trim()
        if ($val) { $td[$m.key] = $val }
      }
    }
    $rawTd = ("" + $r.'Test Data').Trim()
    if ($rawTd) { $td.raw = $rawTd }
    $current = [ordered]@{ title = $title; steps = @(); expected_result = ''; test_data = $td }
    continue
  }
  if (-not $current) { $warnings.Add("Step row before any title row: '$step'"); continue }
  if ($step) { $current.steps += ,([ordered]@{ action = $step; locator_hints = @() }) }
  if ($exp)  { $current.expected_result = $exp }
}
if ($current) { $scenarios.Add($current) }
foreach ($s in $scenarios) { if ($s.steps.Count -eq 0) { $warnings.Add("Scenario has no steps: " + $s.title) } }
$titles = $scenarios | ForEach-Object { $_.title }
$story = if ($titles.Count) { ($titles[0] -split ' - ')[0].Trim() } else { [IO.Path]::GetFileNameWithoutExtension($src) }
$payload = [ordered]@{ story_title = $story; test_scenarios = $scenarios; conversion_warnings = @($warnings) }
$payload | ConvertTo-Json -Depth 12 | Set-Content -Path $out -Encoding UTF8
Write-Host "Wrote $out ($($scenarios.Count) scenarios, $($warnings.Count) warnings)"
```

# Error Handling
- If `source_file` is missing or unreadable: return an empty `test_scenarios[]` with a `conversion_warning` naming the path; do not fabricate scenarios.
- If the workbook headers do not match the contract: add a `conversion_warning` listing the actual headers and attempt a best-effort match on `Title`, `Step Action`, `Expected Result`.
- If a step row appears before any title row: skip it and record a warning.
- If a scenario ends with zero steps: keep it with an empty `steps[]` and warn.

# Outputs
```json
{
  "output_file": "string",
  "output_format": "json | md",
  "story_title": "string",
  "scenario_count": 0,
  "conversion_warnings": ["string"]
}
```

# Quality gate
- Output file exists and re-parses cleanly through `raw-input-parser` (JSON path returns the structure directly; Markdown path yields ≥1 scenario).
- `scenario_count` equals the number of title rows in the workbook.
- No fabricated steps, titles, or expected results — every value traces to a source cell.
