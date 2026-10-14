# validate-config.ps1 — Deterministic input validation for the test-case authoring workflow.
#
# Offloads config validation from the LLM: checks required fields, enums, and
# conditional requirements against workflow-schema.json (JSON Schema, draft-07)
# plus a few friendly conditional checks the schema expresses less clearly.
#
# Exit codes: 0 = valid, 2 = invalid, 1 = file/parse error.

param(
  [string]$ConfigPath = "$PSScriptRoot/../config/workflow-input.current.json",
  [string]$SchemaPath = "$PSScriptRoot/../config/workflow-schema.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$EXIT_OK = 0; $EXIT_INVALID = 2; $EXIT_FILE = 1

function Fail-File([string]$m) { Write-Host "[ERROR] $m" -ForegroundColor Red; exit $EXIT_FILE }

if (-not (Test-Path $ConfigPath)) { Fail-File "Config not found: $ConfigPath (copy workflow-input.example.json to workflow-input.current.json)" }
if (-not (Test-Path $SchemaPath)) { Fail-File "Schema not found: $SchemaPath" }

$rawConfig = Get-Content $ConfigPath -Raw
$rawSchema = Get-Content $SchemaPath -Raw
try { $cfg = $rawConfig | ConvertFrom-Json } catch { Fail-File "Config is not valid JSON: $($_.Exception.Message)" }

$errors = [System.Collections.Generic.List[string]]::new()

# --- JSON Schema validation (structural: types, enums, required, allOf/if-then) ---
try {
  $schemaValid = Test-Json -Json $rawConfig -Schema $rawSchema -ErrorAction SilentlyContinue -ErrorVariable schemaErrs
  if (-not $schemaValid) {
    foreach ($e in $schemaErrs) { $errors.Add("schema: $($e.ToString())") }
  }
} catch {
  # Test-Json throws on some draft-07 keywords; fall through to the explicit checks below.
  Write-Host "[WARN] Schema engine could not fully evaluate the document; relying on explicit checks." -ForegroundColor Yellow
}

function Has([string]$name) { return ($cfg.PSObject.Properties.Name -contains $name) -and ($null -ne $cfg.$name) -and ("$($cfg.$name)".Trim().Length -gt 0) }

# --- Explicit, friendly conditional checks (mirror the schema allOf) ---
$storySource = if (Has 'story_source') { "$($cfg.story_source)" } else { 'ado' }
$outputMode  = if (Has 'output_mode')  { "$($cfg.output_mode)"  } else { '' }
$runMode     = if (Has 'run_mode')     { "$($cfg.run_mode)"     } else { '' }

if ($storySource -notin @('ado','raw-file')) { $errors.Add("story_source must be 'ado' or 'raw-file' (got '$storySource').") }
if ($outputMode  -notin @('excel','ado','both')) { $errors.Add("output_mode must be 'excel', 'ado', or 'both' (got '$outputMode').") }
if ($runMode     -notin @('dry-run','execute')) { $errors.Add("run_mode must be 'dry-run' or 'execute' (got '$runMode').") }

if ($storySource -eq 'ado') {
  if (-not (Has 'ado_org_url'))  { $errors.Add("ado_org_url is required when story_source is 'ado'.") }
  if (-not (Has 'ado_project'))  { $errors.Add("ado_project is required when story_source is 'ado'.") }
  $hasId = ($cfg.PSObject.Properties.Name -contains 'user_story_id') -and ($null -ne $cfg.user_story_id)
  if (-not $hasId -and -not (Has 'user_story_title_keywords')) {
    $errors.Add("Provide user_story_id or user_story_title_keywords when story_source is 'ado'.")
  }
}

if ($storySource -eq 'raw-file') {
  if (-not (Has 'raw_input_file')) { $errors.Add("raw_input_file is required when story_source is 'raw-file'.") }
  elseif (-not (Test-Path $cfg.raw_input_file)) { $errors.Add("raw_input_file not found on disk: $($cfg.raw_input_file)") }
}

# --- UI exploration (optional live-browser pass) ---
if (($cfg.PSObject.Properties.Name -contains 'ui_exploration') -and $cfg.ui_exploration) {
  $ui = $cfg.ui_exploration
  $uiEnabled = ($ui.PSObject.Properties.Name -contains 'enabled') -and ([bool]$ui.enabled)
  if ($uiEnabled) {
    $uiStrategy = if (($ui.PSObject.Properties.Name -contains 'app_auth_strategy') -and $ui.app_auth_strategy) { "$($ui.app_auth_strategy)" } else { 'none' }
    if ($uiStrategy -notin @('none','env-var','cookie-file')) {
      $errors.Add("ui_exploration.app_auth_strategy must be 'none', 'env-var', or 'cookie-file' (got '$uiStrategy').")
    }
    $hasUrl = ($ui.PSObject.Properties.Name -contains 'app_url') -and ($null -ne $ui.app_url) -and ("$($ui.app_url)".Trim().Length -gt 0)
    if (-not $hasUrl) {
      # Fallback: a URL may live in the raw input file. Require raw-file source so one can be resolved.
      if ($storySource -eq 'raw-file' -and (Has 'raw_input_file') -and (Test-Path $cfg.raw_input_file)) {
        $rawText = Get-Content $cfg.raw_input_file -Raw
        if ($rawText -notmatch 'https?://') {
          $errors.Add("ui_exploration.enabled is true but no app_url is set and no http(s) URL was found in raw_input_file ($($cfg.raw_input_file)).")
        }
      } else {
        $errors.Add("ui_exploration.enabled is true but ui_exploration.app_url is not set (and no raw_input_file is available to source a URL from).")
      }
    }
    if ($uiStrategy -eq 'env-var') {
      if (-not $env:APP_USERNAME) { Write-Host "[WARN] ui_exploration.app_auth_strategy is 'env-var' but APP_USERNAME is not set in the environment." -ForegroundColor Yellow }
      if (-not $env:APP_PASSWORD) { Write-Host "[WARN] ui_exploration.app_auth_strategy is 'env-var' but APP_PASSWORD is not set in the environment." -ForegroundColor Yellow }
    }
  }
}

# --- Mobile exploration (optional live-Appium pass) ---
if (($cfg.PSObject.Properties.Name -contains 'mobile_exploration') -and $cfg.mobile_exploration) {
  $mob = $cfg.mobile_exploration
  $mobEnabled = ($mob.PSObject.Properties.Name -contains 'enabled') -and ([bool]$mob.enabled)
  if ($mobEnabled) {
    $mobPlatform = if (($mob.PSObject.Properties.Name -contains 'platform') -and $mob.platform) { "$($mob.platform)" } else { 'android' }
    $mobTarget   = if (($mob.PSObject.Properties.Name -contains 'execution_target') -and $mob.execution_target) { "$($mob.execution_target)" } else { 'local' }
    $mobStrategy = if (($mob.PSObject.Properties.Name -contains 'app_auth_strategy') -and $mob.app_auth_strategy) { "$($mob.app_auth_strategy)" } else { 'none' }
    if ($mobPlatform -notin @('android','ios')) { $errors.Add("mobile_exploration.platform must be 'android' or 'ios' (got '$mobPlatform').") }
    if ($mobTarget   -notin @('local','browserstack')) { $errors.Add("mobile_exploration.execution_target must be 'local' or 'browserstack' (got '$mobTarget').") }
    if ($mobStrategy -notin @('none','env-var')) { $errors.Add("mobile_exploration.app_auth_strategy must be 'none' or 'env-var' (got '$mobStrategy').") }

    function MobHas([string]$name) { return ($mob.PSObject.Properties.Name -contains $name) -and ($null -ne $mob.$name) -and ("$($mob.$name)".Trim().Length -gt 0) }

    if ($mobTarget -eq 'local') {
      if ($mobPlatform -eq 'android' -and -not (MobHas 'app_package') -and -not (MobHas 'app_path')) {
        $errors.Add("mobile_exploration requires app_package or app_path when platform is 'android' and execution_target is 'local'.")
      }
      if ($mobPlatform -eq 'ios' -and -not (MobHas 'bundle_id') -and -not (MobHas 'app_path')) {
        $errors.Add("mobile_exploration requires bundle_id or app_path when platform is 'ios' and execution_target is 'local'.")
      }
      if (-not (MobHas 'appium_server_url')) { Write-Host "[WARN] mobile_exploration.appium_server_url is not set; defaulting to http://127.0.0.1:4723." -ForegroundColor Yellow }
    } else {
      $bs = if ($mob.PSObject.Properties.Name -contains 'browserstack') { $mob.browserstack } else { $null }
      if (-not $bs) { $errors.Add("mobile_exploration.browserstack is required when execution_target is 'browserstack'.") }
      else {
        $bsHasDevice = ($bs.PSObject.Properties.Name -contains 'device') -and $bs.device
        $bsHasOs     = ($bs.PSObject.Properties.Name -contains 'os_version') -and $bs.os_version
        $bsHasApp    = ($bs.PSObject.Properties.Name -contains 'app_id') -and $bs.app_id
        if (-not $bsHasDevice) { $errors.Add("mobile_exploration.browserstack.device is required for browserstack.") }
        if (-not $bsHasOs)     { $errors.Add("mobile_exploration.browserstack.os_version is required for browserstack.") }
        if (-not $bsHasApp)    { $errors.Add("mobile_exploration.browserstack.app_id is required for browserstack.") }
      }
      if (-not $env:BROWSERSTACK_USERNAME)   { Write-Host "[WARN] execution_target is 'browserstack' but BROWSERSTACK_USERNAME is not set." -ForegroundColor Yellow }
      if (-not $env:BROWSERSTACK_ACCESS_KEY) { Write-Host "[WARN] execution_target is 'browserstack' but BROWSERSTACK_ACCESS_KEY is not set." -ForegroundColor Yellow }
    }
    if ($mobStrategy -eq 'env-var') {
      if (-not $env:APP_USERNAME) { Write-Host "[WARN] mobile_exploration.app_auth_strategy is 'env-var' but APP_USERNAME is not set in the environment." -ForegroundColor Yellow }
      if (-not $env:APP_PASSWORD) { Write-Host "[WARN] mobile_exploration.app_auth_strategy is 'env-var' but APP_PASSWORD is not set in the environment." -ForegroundColor Yellow }
    }
  }
}

# --- Authoring phase (development [optionally with live exploration] -> optional enhancement) ---
$phase = if (Has 'authoring_phase') { "$($cfg.authoring_phase)" } else { 'development' }
if ($phase -notin @('development','enhancement')) { $errors.Add("authoring_phase must be 'development' or 'enhancement' (got '$phase').") }

$uiOn  = ($cfg.PSObject.Properties.Name -contains 'ui_exploration') -and $cfg.ui_exploration -and ($cfg.ui_exploration.PSObject.Properties.Name -contains 'enabled') -and [bool]$cfg.ui_exploration.enabled
$mobOn = ($cfg.PSObject.Properties.Name -contains 'mobile_exploration') -and $cfg.mobile_exploration -and ($cfg.mobile_exploration.PSObject.Properties.Name -contains 'enabled') -and [bool]$cfg.mobile_exploration.enabled

if ($phase -eq 'development' -and ($uiOn -or $mobOn)) {
  Write-Host "[INFO] authoring_phase 'development' with live exploration enabled: single-pass authoring (story + deployed app) - produces the baseline in one run." -ForegroundColor Cyan
}

if ($phase -eq 'enhancement') {
  if (-not ($uiOn -or $mobOn)) {
    $errors.Add("authoring_phase is 'enhancement' but neither ui_exploration.enabled nor mobile_exploration.enabled is true.")
  }
  $enh = if (($cfg.PSObject.Properties.Name -contains 'enhancement') -and $cfg.enhancement) { $cfg.enhancement } else { $null }
  $storyId = if (($cfg.PSObject.Properties.Name -contains 'user_story_id') -and $null -ne $cfg.user_story_id) { "$($cfg.user_story_id)" } else { $null }
  $artifactsDir = Join-Path $PSScriptRoot '../artifacts'

  $baseline = if ($enh -and ($enh.PSObject.Properties.Name -contains 'baseline_cases_path') -and $enh.baseline_cases_path) { "$($enh.baseline_cases_path)" } elseif ($storyId) { Join-Path $artifactsDir "testcases-$storyId.json" } else { $null }
  if (-not $baseline) {
    $errors.Add("enhancement.baseline_cases_path is required when authoring_phase is 'enhancement' and user_story_id is null.")
  } elseif (-not (Test-Path $baseline)) {
    $errors.Add("Phase 1 baseline not found: $baseline. Run authoring_phase 'development' first (or set enhancement.baseline_cases_path).")
  }

  # Phase 2 never writes to ADO - it updates the Phase 1 workbook in place.
  if ($outputMode -ne 'excel') {
    $errors.Add("authoring_phase 'enhancement' updates the existing Excel workbook only - set output_mode to 'excel' (got '$outputMode'). No direct ADO writes in Phase 2.")
  }
  $wb = if ($enh -and ($enh.PSObject.Properties.Name -contains 'baseline_workbook_path') -and $enh.baseline_workbook_path) { "$($enh.baseline_workbook_path)" } else { $null }
  if (-not $wb -and ($cfg.PSObject.Properties.Name -contains 'excel') -and $cfg.excel -and ($cfg.excel.PSObject.Properties.Name -contains 'output_file_basename') -and $cfg.excel.output_file_basename) {
    foreach ($dirProp in @('primary_output_dir','fallback_output_dir')) {
      if (($cfg.excel.PSObject.Properties.Name -contains $dirProp) -and $cfg.excel.$dirProp) {
        $candidate = Join-Path "$($cfg.excel.$dirProp)" "$($cfg.excel.output_file_basename).xlsx"
        if (Test-Path $candidate) { $wb = $candidate; break }
      }
    }
  }
  if (-not $wb) {
    $errors.Add("Phase 1 workbook not found. Set enhancement.baseline_workbook_path, or ensure <excel.primary_output_dir|fallback_output_dir>/<excel.output_file_basename>.xlsx exists.")
  } elseif (-not (Test-Path $wb)) {
    $errors.Add("enhancement.baseline_workbook_path not found: $wb")
  } else {
    Write-Host "[INFO] Phase 2 will update workbook in place: $wb" -ForegroundColor Cyan
  }
}

if ($outputMode -in @('ado','both')) {
  if (-not (Has 'ado_project')) { $errors.Add("ado_project is required when output_mode includes 'ado'.") }
  $planId = if (($cfg.PSObject.Properties.Name -contains 'ado_publish') -and $cfg.ado_publish) { $cfg.ado_publish.target_test_plan_id } else { $null }
  if ($null -eq $planId) { $errors.Add("ado_publish.target_test_plan_id is required when output_mode includes 'ado'.") }
  if ($runMode -eq 'execute' -and "$($cfg.execution_confirmation)" -ne 'APPROVED_EXECUTE') {
    $errors.Add("execution_confirmation must equal 'APPROVED_EXECUTE' to publish to ADO in execute mode.")
  }
}

# Local doc paths existence (warn, not fail — they may be intentionally absent)
if (($cfg.PSObject.Properties.Name -contains 'source_local_doc_paths') -and $cfg.source_local_doc_paths) {
  foreach ($p in $cfg.source_local_doc_paths) {
    if ($p -and -not (Test-Path $p)) { Write-Host "[WARN] source_local_doc_path not found: $p" -ForegroundColor Yellow }
  }
}

if ($errors.Count -gt 0) {
  Write-Host "[INVALID] $($errors.Count) configuration problem(s):" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit $EXIT_INVALID
}

Write-Host "[OK] Config valid: authoring_phase=$phase story_source=$storySource output_mode=$outputMode run_mode=$runMode" -ForegroundColor Green
exit $EXIT_OK
