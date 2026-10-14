# validate-testcases.ps1 — Deterministic structural validation of generated test cases.
#
# Offloads the testcase-generator "Quality gate" structural self-check from the LLM.
# The agent writes its generated cases (the testcase-generator output shape) to a JSON
# file, then calls this to verify the canonical 22-column row pattern and the ISTQB
# metadata fields deterministically. Semantic checks (no fabricated values, coverage
# judgment) remain with the LLM.
#
# Input JSON shape: { "test_cases": [ { test_case_id, title, scenario, test_condition,
#   type, test_level, technique, category, priority, severity, risk_rating,
#   automation_feasibility, work_item_type, state, area_path, req_ids: [..],
#   steps: [ { index, action, expected_result } ] } ],
#   "traceability_matrix": [..], "coverage": {...} }
#
# Phase 2 (enhancement): when the document has authoring_phase = "enhancement", every
# case must carry change_type (Unchanged | Updated | New | Obsolete-Candidate) and
# Updated/New/Obsolete-Candidate cases must carry change_summary. With -BaselinePath,
# every Phase 1 test_case_id must still be present (no silent drops) and New cases
# must not reuse a baseline ID.
#
# Exit codes: 0 = structurally valid, 2 = violations found, 1 = file/parse error.

param(
  [Parameter(Mandatory = $true)][string]$CasesPath,
  [int]$MaxStepsPerCase = 15,
  [string]$BaselinePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $CasesPath)) { Write-Host "[ERROR] Cases file not found: $CasesPath" -ForegroundColor Red; exit 1 }
try { $doc = Get-Content $CasesPath -Raw | ConvertFrom-Json } catch { Write-Host "[ERROR] Not valid JSON: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }

if (-not ($doc.PSObject.Properties.Name -contains 'test_cases') -or -not $doc.test_cases) {
  Write-Host "[ERROR] No 'test_cases' array present." -ForegroundColor Red; exit 1
}

$violations = [System.Collections.Generic.List[string]]::new()
$validTypes = @('Positive','Negative','Boundary')
$validLevels = @('Component','Integration','System','UAT')
$validTechniques = @('EP','BVA','Decision Table','State Transition','Pairwise','Error Guessing','Exploratory')
$validCategories = @('Functional','Security','Performance','Accessibility','Compatibility','Recovery','API','Database','Usability')
$validSeverities = @('Critical','High','Medium','Low')
$validRiskRatings = @('High','Medium','Low')
$validAutomation = @('High','Medium','Low','Not Feasible')
$validChangeTypes = @('Unchanged','Updated','New','Obsolete-Candidate')
$isEnhancement = ($doc.PSObject.Properties.Name -contains 'authoring_phase') -and ("$($doc.authoring_phase)" -eq 'enhancement')
$i = 0
foreach ($tc in $doc.test_cases) {
  $i++
  $label = if ($tc.PSObject.Properties.Name -contains 'title' -and $tc.title) { "'$($tc.title)'" } else { "case #$i" }

  foreach ($f in @('title','type','work_item_type','state','area_path')) {
    if (-not ($tc.PSObject.Properties.Name -contains $f) -or [string]::IsNullOrWhiteSpace("$($tc.$f)")) {
      $violations.Add(("{0}: missing TC-level field '{1}'." -f $label, $f))
    }
  }
  # ISTQB metadata fields (all mandatory)
  foreach ($f in @('test_case_id','test_condition','scenario','test_level','technique','category','severity','risk_rating','automation_feasibility')) {
    if (-not ($tc.PSObject.Properties.Name -contains $f) -or [string]::IsNullOrWhiteSpace("$($tc.$f)")) {
      $violations.Add(("{0}: missing ISTQB metadata field '{1}'." -f $label, $f))
    }
  }
  # req_ids must be a non-empty array
  if (-not ($tc.PSObject.Properties.Name -contains 'req_ids') -or -not $tc.req_ids -or @($tc.req_ids).Count -lt 1) {
    $violations.Add(("{0}: 'req_ids' must be a non-empty array (requirements traceability)." -f $label))
  }
  # priority must be an integer 1..4
  if (-not ($tc.PSObject.Properties.Name -contains 'priority') -or "$($tc.priority)" -notmatch '^[1-4]$') {
    $violations.Add(("{0}: 'priority' must be an integer 1-4." -f $label))
  }
  if ($tc.PSObject.Properties.Name -contains 'title' -and "$($tc.title)" -match '<scenario>') {
    $violations.Add(("{0}: title still contains the '<scenario>' placeholder." -f $label))
  }
  if ($tc.PSObject.Properties.Name -contains 'type' -and $tc.type -notin $validTypes) {
    $violations.Add(("{0}: type '{1}' must be one of Positive/Negative/Boundary." -f $label, $tc.type))
  }
  if ($tc.PSObject.Properties.Name -contains 'test_level' -and "$($tc.test_level)" -and $tc.test_level -notin $validLevels) {
    $violations.Add(("{0}: test_level '{1}' must be one of Component/Integration/System/UAT." -f $label, $tc.test_level))
  }
  if ($tc.PSObject.Properties.Name -contains 'technique' -and "$($tc.technique)" -and $tc.technique -notin $validTechniques) {
    $violations.Add(("{0}: technique '{1}' must be one of EP/BVA/Decision Table/State Transition/Pairwise/Error Guessing/Exploratory." -f $label, $tc.technique))
  }
  if ($tc.PSObject.Properties.Name -contains 'category' -and "$($tc.category)" -and $tc.category -notin $validCategories) {
    $violations.Add(("{0}: category '{1}' must be one of Functional/Security/Performance/Accessibility/Compatibility/Recovery/API/Database/Usability." -f $label, $tc.category))
  }
  if ($tc.PSObject.Properties.Name -contains 'severity' -and "$($tc.severity)" -and $tc.severity -notin $validSeverities) {
    $violations.Add(("{0}: severity '{1}' must be one of Critical/High/Medium/Low." -f $label, $tc.severity))
  }
  if ($tc.PSObject.Properties.Name -contains 'risk_rating' -and "$($tc.risk_rating)" -and $tc.risk_rating -notin $validRiskRatings) {
    $violations.Add(("{0}: risk_rating '{1}' must be one of High/Medium/Low." -f $label, $tc.risk_rating))
  }
  if ($tc.PSObject.Properties.Name -contains 'automation_feasibility' -and "$($tc.automation_feasibility)" -and $tc.automation_feasibility -notin $validAutomation) {
    $violations.Add(("{0}: automation_feasibility '{1}' must be one of High/Medium/Low/Not Feasible." -f $label, $tc.automation_feasibility))
  }

  if ($isEnhancement) {
    $ct = if ($tc.PSObject.Properties.Name -contains 'change_type') { "$($tc.change_type)" } else { '' }
    if ($ct -notin $validChangeTypes) {
      $violations.Add(("{0}: change_type '{1}' must be one of Unchanged/Updated/New/Obsolete-Candidate (enhancement phase)." -f $label, $ct))
    } elseif ($ct -ne 'Unchanged' -and (-not ($tc.PSObject.Properties.Name -contains 'change_summary') -or [string]::IsNullOrWhiteSpace("$($tc.change_summary)"))) {
      $violations.Add(("{0}: change_type '{1}' requires a non-empty change_summary." -f $label, $ct))
    }
  }

  if (-not ($tc.PSObject.Properties.Name -contains 'steps') -or -not $tc.steps -or @($tc.steps).Count -lt 1) {
    $violations.Add(("{0}: must have at least one step." -f $label))
    continue
  }
  $steps = @($tc.steps)
  if ($steps.Count -gt $MaxStepsPerCase) {
    $violations.Add(("{0}: has {1} steps (> max {2}); split into linked cases." -f $label, $steps.Count, $MaxStepsPerCase))
  }

  for ($s = 0; $s -lt $steps.Count; $s++) {
    $step = $steps[$s]
    $isLast = ($s -eq $steps.Count - 1)
    if ([string]::IsNullOrWhiteSpace("$($step.action)")) { $violations.Add(("{0}: step {1} has an empty Step Action." -f $label, ($s + 1))) }
    $hasExpected = ($step.PSObject.Properties.Name -contains 'expected_result') -and -not [string]::IsNullOrWhiteSpace("$($step.expected_result)")
    if ($isLast -and -not $hasExpected) { $violations.Add(("{0}: last step must have an Expected Result." -f $label)) }
    if (-not $isLast -and $hasExpected) { $violations.Add(("{0}: only the last step may carry an Expected Result (step {1} has one)." -f $label, ($s + 1))) }
  }
}

# Coverage sanity (structural only)
if ($doc.PSObject.Properties.Name -contains 'coverage' -and $doc.coverage) {
  if ($doc.coverage.PSObject.Properties.Name -contains 'examples_mapping_confirmed' -and $doc.coverage.examples_mapping_confirmed -ne $true) {
    Write-Host "[WARN] coverage.examples_mapping_confirmed is not true — verify SpecFlow Examples 1:1 mapping." -ForegroundColor Yellow
  }
}

# Traceability matrix presence (structural only)
if (-not ($doc.PSObject.Properties.Name -contains 'traceability_matrix') -or -not $doc.traceability_matrix -or @($doc.traceability_matrix).Count -lt 1) {
  $violations.Add("Missing 'traceability_matrix' — every requirement must map to its test case IDs (RTM).")
} else {
  $rowNum = 0
  foreach ($row in $doc.traceability_matrix) {
    $rowNum++
    if (-not ($row.PSObject.Properties.Name -contains 'req_id') -or [string]::IsNullOrWhiteSpace("$($row.req_id)")) {
      $violations.Add("traceability_matrix row #${rowNum}: missing 'req_id'.")
    }
    if (-not ($row.PSObject.Properties.Name -contains 'test_case_ids') -or -not $row.test_case_ids -or @($row.test_case_ids).Count -lt 1) {
      $violations.Add("traceability_matrix row #${rowNum} ('$($row.req_id)'): must map to at least one test_case_id.")
    }
  }
}

# Baseline reconciliation (Phase 2): no Phase 1 case may be silently dropped.
if ($BaselinePath) {
  if (-not (Test-Path $BaselinePath)) { Write-Host "[ERROR] Baseline file not found: $BaselinePath" -ForegroundColor Red; exit 1 }
  try { $base = Get-Content $BaselinePath -Raw | ConvertFrom-Json } catch { Write-Host "[ERROR] Baseline is not valid JSON: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
  $baseIds = @($base.test_cases | ForEach-Object { if ($_.PSObject.Properties.Name -contains 'test_case_id') { "$($_.test_case_id)" } } | Where-Object { $_ })
  $curById = @{}
  foreach ($tc in $doc.test_cases) { if ($tc.PSObject.Properties.Name -contains 'test_case_id') { $curById["$($tc.test_case_id)"] = $tc } }
  function Get-Ct($o) { if ($o.PSObject.Properties.Name -contains 'change_type') { "$($o.change_type)" } else { '' } }
  foreach ($id in $baseIds) {
    if (-not $curById.ContainsKey($id)) { $violations.Add("Baseline case '$id' is missing from the enhanced set - keep it as Unchanged/Updated/Obsolete-Candidate, never drop it.") }
    elseif ((Get-Ct $curById[$id]) -eq 'New') { $violations.Add("Case '$id' is marked New but its ID already exists in the baseline - assign the next free TC ID.") }
  }
  foreach ($tc in $doc.test_cases) {
    $tcId = if ($tc.PSObject.Properties.Name -contains 'test_case_id') { "$($tc.test_case_id)" } else { '' }
    if ($tcId -and $tcId -notin $baseIds -and (Get-Ct $tc) -ne 'New') {
      $violations.Add("Case '$tcId' is not in the baseline, so change_type must be 'New' (got '$(Get-Ct $tc)').")
    }
  }
}

if ($violations.Count -gt 0) {
  Write-Host "[INVALID] $($violations.Count) structural violation(s) across $i case(s):" -ForegroundColor Red
  $violations | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 2
}

Write-Host "[OK] $i test case(s) conform to the canonical row/column structure and ISTQB metadata fields." -ForegroundColor Green
exit 0
