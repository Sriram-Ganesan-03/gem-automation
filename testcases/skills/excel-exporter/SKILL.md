---
name: excel-exporter
description: "Use to write generated test cases to a formatted .xlsx workbook via the ImportExcel PowerShell module, honoring the canonical 22-column ISTQB layout, title/step row styling, RTM + coverage + risk summary sheets, and AppLocker-safe inline execution."
---

# Goal
Render the `testcase-generator` output into a formatted Excel workbook that matches the ADO test-case import layout, using the `ImportExcel` module. Emit the main **Test Cases** sheet (22 columns) plus summary sheets for the ISTQB deliverables (Traceability, Coverage, Risk).

# Inputs
- `testcase-generator` output (`test_cases[]`, `analysis`, `traceability_matrix`, `coverage`, `risk_coverage`, `missing_requirements`, `ambiguous_requirements`, `exploratory_test_ideas`).
- `excel.worksheet`, `excel.primary_output_dir`, `excel.fallback_output_dir`, `excel.output_file_basename`.

# Execution method (AppLocker-safe — CRITICAL)
- **Do NOT create `.ps1` or `.py` files.** AppLocker blocks scripts in user-writable paths.
- Run all PowerShell **inline** via the command parameter directly.
- Avoid helper/function names that collide with PowerShell aliases (e.g. do not use `sl`, `gc`, `cd`). Use distinct names like `mkE`, `mkS`.
- Ensure `ImportExcel` is available: `if (-not (Get-Module -ListAvailable ImportExcel)) { Install-Module ImportExcel -Scope CurrentUser -Force }`.

# Column order (exact, 22 columns)
`Work Item Type, Test Case ID, Requirement ID, Test Condition, Scenario, Title, Type, Test Level, Technique, Category, Priority, Severity, Risk Rating, Automation Feasibility, State, Area Path, Assigned To, Preconditions, Test Step, Step Action, Expected Result, Test Data`

# Row emission (main "Test Cases" sheet)
Emit rows in the canonical order and pattern from `testcase-generator`:
1. **Title row** per test case — fill columns 1–18: Work Item Type, Test Case ID, Requirement ID (join `req_ids` with `, `), Test Condition, Scenario, Title, Type, Test Level, Technique, Category, Priority, Severity, Risk Rating, Automation Feasibility, State, Area Path, Assigned To, Preconditions, Test Data. Leave Test Step, Step Action, Expected Result blank.
2. **Step rows 1..N-1** — fill only Test Step (the step index) and Step Action.
3. **Last step row N** — fill Test Step, Step Action, Expected Result.

# Formatting rules
- **Header row (row 1)**: bold, white font, blue background RGB(68,114,196), centered.
- **Title rows**: bold, light-blue background RGB(217,225,242) across all 22 columns.
- **Step rows**: no special formatting.
- Auto-size columns with a max width of 80.
- Freeze panes at row 2.
- Wrap text for all cells.
- Worksheet name = `excel.worksheet` (default `Test Cases`).

# Summary worksheets (ISTQB deliverables)
After the main sheet, append these sheets to the same workbook (each with a bold blue header row, auto-size, wrap, freeze row 2). Skip a sheet only when its source data is empty, and record that under the run warnings.
- **`Traceability`** — from `traceability_matrix[]`. Columns: `Requirement ID, Test Conditions, Test Case IDs, Levels, Techniques, Covered`. One row per requirement (join arrays with `, `).
- **`Coverage`** — from `coverage`. Sections/blocks for `by_type`, `by_level`, `by_category`, `by_technique`, and `by_requirement` (Requirement ID → Case Count). Include `examples_mapping_confirmed`.
- **`Risk`** — from `risk_coverage`. Columns: a `by_rating` block (High/Medium/Low counts) and a `high_risk_requirements` table (`Requirement ID, Case Count, Covered`).
- **`Gaps & Ideas`** — three labeled blocks: `Missing Requirements` (from `missing_requirements[]`), `Ambiguous Requirements` (from `ambiguous_requirements[]`: `Requirement ID, Issue, Assumption Made`), and `Exploratory Test Ideas` (from `exploratory_test_ideas[]`).

**Phase 2 (`authoring_phase: enhancement`) — update the same workbook in place (no new file, no ADO writes):**
- Target = `enhancement.baseline_workbook_path`, else `<excel.primary_output_dir>/<excel.output_file_basename>.xlsx`, else the same name in `excel.fallback_output_dir`.
- **Back up first:** copy it to `<basename>_backup_<yyyyMMdd-HHmmss>.xlsx` in the same folder before any change. If the file is locked/open, stop and ask the Human to close it (do not write a `_v2` copy).
- **`Test Cases` sheet** — clear the data rows and rewrite the full enhanced set with the exact 22 columns (header row kept). Tint each case's title row by `change_type`: Updated = light yellow `FFF2CC`, New = light green `E2EFDA`, Obsolete-Candidate = light grey `EDEDED`, Unchanged = no fill.
- Replace `Traceability` / `Coverage` / `Risk` / `Gaps & Ideas` with the enhanced data.
- Add or replace **`Enhancement Changes`** — `Test Case ID, Change Type, Change Summary, Title`, sorted Updated → New → Obsolete-Candidate → Unchanged, with `environment_label` and the `change_log` counts above the table.
- Add or replace **`Discrepancies`** — from `discrepancies[]`: `Requirement ID, Expected per AC, Observed in UI, Evidence, Test Case IDs`.
- Verify afterwards with `Open-ExcelPackage` (row count matches, new sheets present) and report the updated path and backup path.

# Save behavior
- Save `.xlsx` to `excel.primary_output_dir` as `<output_file_basename>.xlsx`.
- If the file is locked/open, save a versioned name (e.g. `_v2`) in the same folder.
- If the primary directory is unavailable, save to `excel.fallback_output_dir`.
- If `Close-ExcelPackage -Save` is unreliable, fall back to `$xl.Save(); $xl.Dispose()`.
- When appending to an existing workbook, open it and write values cell-by-cell rather than overwriting.

# Implementation notes
- Build an array of ordered `[pscustomobject]` rows, pipe to `Export-Excel` with `-WorksheetName`, `-AutoSize`, `-FreezeTopRow`, and `-PassThru` to obtain the package for styling.
- Apply header/title styling with `Set-ExcelRange` (BackgroundColor via `[System.Drawing.Color]::FromArgb(68,114,196)` etc., `Bold`, `HorizontalAlignment Center`, `WrapText`).
- Track which spreadsheet rows are title rows so styling targets only those.

# Outputs
```json
{
  "file_path": "string",
  "worksheet": "string",
  "row_count": 0,
  "versioned": false,
  "fallback_used": false
}
```

# Quality gate
- File written and openable; main-sheet row count equals title rows + step rows.
- Main sheet has all 22 columns in the exact order above.
- Traceability, Coverage, Risk, and Gaps & Ideas sheets present whenever their source arrays are non-empty.
- Header, title, and step styling applied; freeze pane at row 2; wrap text on.
- No `.ps1`/`.py` file was created (inline execution only).
