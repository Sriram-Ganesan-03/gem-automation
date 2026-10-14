param(
  [string]$ConfigPath        = "$PSScriptRoot/../config/workflow-input.current.json",
  [string]$AdoGuardrailsPath = "$PSScriptRoot/../config/ado-operation-guardrails.json",
  [string]$EnvOutputPath     = "$PSScriptRoot/../artifacts/.env"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Exit codes
# ---------------------------------------------------------------------------
$EXIT_OK          = 0
$EXIT_FILE        = 1   # File not found or unreadable
$EXIT_GUARDRAIL   = 2   # Security guardrail constant violated
$EXIT_CONFIG      = 3   # One or more config field validation failures
$EXIT_ENVIRONMENT = 4   # Required environment variable missing

# ---------------------------------------------------------------------------
# Structured logger  — Write-Log -Level INFO|WARN|ERROR|SUCCESS -Message ...
# ---------------------------------------------------------------------------
function Write-Log {
  param(
    [ValidateSet('INFO','WARN','ERROR','SUCCESS')]
    [string]$Level,
    [string]$Message,
    [string]$Category = ''
  )
  $timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
  $prefix    = if ($Category) { "[$Category]" } else { '' }
  $line      = "$timestamp  [$Level]  $prefix $Message".TrimEnd()

  switch ($Level) {
    'ERROR'   { Write-Host $line -ForegroundColor Red     }
    'WARN'    { Write-Host $line -ForegroundColor Yellow  }
    'SUCCESS' { Write-Host $line -ForegroundColor Green   }
    default   { Write-Host $line                          }
  }
}

# Escape a value for use as a TypeScript single-quoted string literal.
function ConvertTo-TsString([string]$Value) {
  return $Value.Replace('\', '\\').Replace("'", "\'")
}

# ---------------------------------------------------------------------------
# Aggregation buckets — filled during validation, reported at the end
# ---------------------------------------------------------------------------
$configErrors = [System.Collections.Generic.List[string]]::new()
$envErrors    = [System.Collections.Generic.List[string]]::new()

$runStartTime = Get-Date

# ---------------------------------------------------------------------------
# PHASE 1 — File access  (fail-fast; nothing else can run without these files)
# ---------------------------------------------------------------------------
Write-Log INFO 'Starting preflight guardrail checks.' 'PREFLIGHT'

try {
  if (-not (Test-Path $ConfigPath)) {
    throw "Config file not found: $ConfigPath"
  }
  Write-Log INFO "Config file resolved: $ConfigPath" 'FILE'
}
catch {
  Write-Log ERROR $_.Exception.Message 'FILE'
  Write-Log ERROR "Preflight aborted — cannot locate workflow config." 'PREFLIGHT'
  exit $EXIT_FILE
}

try {
  if (-not (Test-Path $AdoGuardrailsPath)) {
    throw "ADO guardrails file not found: $AdoGuardrailsPath"
  }
  Write-Log INFO "Guardrails file resolved: $AdoGuardrailsPath" 'FILE'
}
catch {
  Write-Log ERROR $_.Exception.Message 'FILE'
  Write-Log ERROR "Preflight aborted — cannot locate ADO guardrails config." 'PREFLIGHT'
  exit $EXIT_FILE
}

# ---------------------------------------------------------------------------
# PHASE 2 — JSON parsing  (fail-fast; malformed JSON is unrecoverable)
# ---------------------------------------------------------------------------
try {
  $cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
  Write-Log INFO "Workflow config parsed successfully." 'PARSE'
}
catch {
  Write-Log ERROR "Failed to parse config JSON: $($_.Exception.Message)" 'PARSE'
  Write-Log ERROR "Fix JSON syntax in: $ConfigPath" 'PARSE'
  exit $EXIT_FILE
}

try {
  $adoGuard = Get-Content $AdoGuardrailsPath -Raw | ConvertFrom-Json
  Write-Log INFO "ADO guardrails config parsed successfully." 'PARSE'
}
catch {
  Write-Log ERROR "Failed to parse ADO guardrails JSON: $($_.Exception.Message)" 'PARSE'
  Write-Log ERROR "Fix JSON syntax in: $AdoGuardrailsPath" 'PARSE'
  exit $EXIT_FILE
}

# ---------------------------------------------------------------------------
# PHASE 3 — Security guardrail constants  (fail-fast; these are hard stops)
#            A guardrail violation must never silently continue.
# ---------------------------------------------------------------------------
Write-Log INFO 'Checking ADO security guardrail constants...' 'GUARDRAIL'

try {
  if (-not $adoGuard.failClosed) {
    throw 'ADO guardrails must be fail-closed (failClosed: true).'
  }
  if ($adoGuard.mode -ne 'read-only') {
    throw "ADO guardrails mode must be read-only. Found: $($adoGuard.mode)"
  }
  if (-not $adoGuard.blockedWriteOperations -or $adoGuard.blockedWriteOperations.Count -lt 1) {
    throw 'blockedWriteOperations must be defined and non-empty.'
  }
  if (-not $adoGuard.allowedReadOperations -or $adoGuard.allowedReadOperations.Count -lt 1) {
    throw 'allowedReadOperations must be defined and non-empty.'
  }
  if ($cfg.allow_ado_mutation -ne $false) {
    throw "allow_ado_mutation must be false. Found: $($cfg.allow_ado_mutation)"
  }
  if ($cfg.allow_probe_resources -ne $false) {
    throw "allow_probe_resources must be false. Found: $($cfg.allow_probe_resources)"
  }
  if ($cfg.ado_access_mode -ne 'read-only') {
    throw "ado_access_mode must be read-only. Found: $($cfg.ado_access_mode)"
  }
  if ($cfg.ado_tool_calls_mode -ne 'read-wrapper-only') {
    throw "ado_tool_calls_mode must be read-wrapper-only. Found: $($cfg.ado_tool_calls_mode)"
  }
  if ($cfg.ado_write_tools_disabled -ne $true) {
    throw "ado_write_tools_disabled must be true. Found: $($cfg.ado_write_tools_disabled)"
  }
  Write-Log INFO 'ADO security guardrail constants passed.' 'GUARDRAIL'
}
catch {
  Write-Log ERROR "GUARDRAIL VIOLATION — $($_.Exception.Message)" 'GUARDRAIL'
  Write-Log ERROR 'Preflight aborted. A security guardrail constant was violated.' 'PREFLIGHT'
  exit $EXIT_GUARDRAIL
}

# ---------------------------------------------------------------------------
# PHASE 4 — Config field validation  (aggregated; report all failures at once)
# ---------------------------------------------------------------------------
Write-Log INFO 'Validating workflow config fields...' 'CONFIG'

# Required field presence (always required)
$requiredFields = @(
  'app_base_url', 'app_auth_strategy', 'test_output_path',
  'input_source',
  'run_mode',
  'allow_ado_mutation', 'allow_probe_resources',
  'ado_access_mode', 'ado_tool_calls_mode', 'ado_write_tools_disabled'
)
foreach ($field in $requiredFields) {
  if (-not ($cfg.PSObject.Properties.Name -contains $field)) {
    $configErrors.Add("Missing required field: '$field'")
  }
}

# Non-empty string checks — always-required fields
$nonEmptyChecks = @{
  app_base_url         = $cfg.PSObject.Properties.Name -contains 'app_base_url'         ? $cfg.app_base_url         : $null
  app_auth_strategy    = $cfg.PSObject.Properties.Name -contains 'app_auth_strategy'    ? $cfg.app_auth_strategy    : $null
  test_output_path     = $cfg.PSObject.Properties.Name -contains 'test_output_path'     ? $cfg.test_output_path     : $null
}
foreach ($entry in $nonEmptyChecks.GetEnumerator()) {
  if ($null -ne $entry.Value -and [string]::IsNullOrWhiteSpace($entry.Value)) {
    $configErrors.Add("Field '$($entry.Key)' must not be empty.")
  }
}

# Enum: input_source
$validInputSources = @('ado', 'raw-file')
$resolvedInputSource = $null
if ($cfg.PSObject.Properties.Name -contains 'input_source') {
  if ($cfg.input_source -notin $validInputSources) {
    $configErrors.Add("'input_source' must be one of: $($validInputSources -join ', '). Found: '$($cfg.input_source)'")
  } else {
    $resolvedInputSource = $cfg.input_source
  }
}

# Conditional required fields based on input_source
if ($resolvedInputSource -eq 'raw-file') {
  # raw_input_file is required and the file must exist
  if (-not ($cfg.PSObject.Properties.Name -contains 'raw_input_file') -or [string]::IsNullOrWhiteSpace($cfg.raw_input_file)) {
    $configErrors.Add("'raw_input_file' is required when 'input_source' is 'raw-file'.")
  } else {
    $rawFileExt = [System.IO.Path]::GetExtension($cfg.raw_input_file).ToLower()
    if ($rawFileExt -notin @('.md', '.txt', '.json', '.xlsx')) {
      $configErrors.Add("'raw_input_file' must be a .md, .txt, .json, or .xlsx (Test Cases workflow output) file. Found extension: '$rawFileExt'")
    } elseif (-not (Test-Path $cfg.raw_input_file)) {
      $configErrors.Add("'raw_input_file' not found on disk: '$($cfg.raw_input_file)'")
    }
  }
} else {
  # ado mode: user story — accept full URL or numeric ID
  $hasUserStoryLink = $cfg.PSObject.Properties.Name -contains 'user_story_ado_link' -and -not [string]::IsNullOrWhiteSpace($cfg.user_story_ado_link)
  $hasUserStoryId   = $cfg.PSObject.Properties.Name -contains 'user_story_id'      -and $null -ne $cfg.user_story_id
  if (-not $hasUserStoryLink -and -not $hasUserStoryId) {
    $configErrors.Add("'user_story_ado_link' or 'user_story_id' is required when 'input_source' is 'ado'.")
  }

  # ado mode: test cases — accept full URL or plan ID + suite ID pair
  $hasTestCasesLink  = $cfg.PSObject.Properties.Name -contains 'test_cases_ado_link' -and -not [string]::IsNullOrWhiteSpace($cfg.test_cases_ado_link)
  $hasTestPlanSuite  = ($cfg.PSObject.Properties.Name -contains 'test_plan_id'  -and $null -ne $cfg.test_plan_id) -and
                       ($cfg.PSObject.Properties.Name -contains 'test_suite_id' -and $null -ne $cfg.test_suite_id)
  if (-not $hasTestCasesLink -and -not $hasTestPlanSuite) {
    $configErrors.Add("'test_cases_ado_link' or the 'test_plan_id'+'test_suite_id' pair is required when 'input_source' is 'ado'.")
  }
}

# Optional non-empty: report_output_path
if ($cfg.PSObject.Properties.Name -contains 'report_output_path' -and
    [string]::IsNullOrWhiteSpace($cfg.report_output_path)) {
  $configErrors.Add("'report_output_path' must not be empty when specified. Remove the field to use the default (playwright-report).")
}

# Enum: app_auth_strategy
$validAuthStrategies = @('none', 'env-var', 'cookie-file')
if ($cfg.PSObject.Properties.Name -contains 'app_auth_strategy' -and
    $cfg.app_auth_strategy -notin $validAuthStrategies) {
  $configErrors.Add("'app_auth_strategy' must be one of: $($validAuthStrategies -join ', '). Found: '$($cfg.app_auth_strategy)'")
}

# Enum: run_mode
if ($cfg.PSObject.Properties.Name -contains 'run_mode' -and
    $cfg.run_mode -ne 'dry-run' -and $cfg.run_mode -ne 'execute') {
  $configErrors.Add("'run_mode' must be 'dry-run' or 'execute'. Found: '$($cfg.run_mode)'")
}

# Execute-mode gate
if ($cfg.PSObject.Properties.Name -contains 'run_mode' -and $cfg.run_mode -eq 'execute') {
  if (-not ($cfg.PSObject.Properties.Name -contains 'execution_confirmation')) {
    $configErrors.Add("'execution_confirmation' is required when 'run_mode' is 'execute'.")
  }
  elseif ($cfg.execution_confirmation -ne 'APPROVED_EXECUTE') {
    $configErrors.Add("'execution_confirmation' must be 'APPROVED_EXECUTE' to unlock execute mode. Found: '$($cfg.execution_confirmation)'")
  }

  # reviewer_ado_user_id, target_repo, target_branch are required only in execute mode
  foreach ($field in @('reviewer_ado_user_id', 'target_repo', 'target_branch')) {
    if (-not ($cfg.PSObject.Properties.Name -contains $field)) {
      $configErrors.Add("Missing required field: '$field' (required when 'run_mode' is 'execute')")
    } elseif ([string]::IsNullOrWhiteSpace($cfg.$field)) {
      $configErrors.Add("Field '$field' must not be empty (required when 'run_mode' is 'execute').")
    }
  }
}

# Enum: playwright_project_mode
$validProjectModes = @('new', 'existing')
if ($cfg.PSObject.Properties.Name -contains 'playwright_project_mode') {
  if ($cfg.playwright_project_mode -notin $validProjectModes) {
    $configErrors.Add("'playwright_project_mode' must be one of: $($validProjectModes -join ', '). Found: '$($cfg.playwright_project_mode)'")
  }
  elseif ($cfg.playwright_project_mode -eq 'existing') {
    if (-not ($cfg.PSObject.Properties.Name -contains 'playwright_config_path') -or
        [string]::IsNullOrWhiteSpace($cfg.playwright_config_path)) {
      $configErrors.Add("'playwright_config_path' is required when 'playwright_project_mode' is 'existing'.")
    }
  }
}

# Enum: screenshot_mode
$validScreenshotModes = @('all', 'on-failure', 'none')
if ($cfg.PSObject.Properties.Name -contains 'screenshot_mode' -and
    $cfg.screenshot_mode -notin $validScreenshotModes) {
  $configErrors.Add("'screenshot_mode' must be one of: $($validScreenshotModes -join ', '). Found: '$($cfg.screenshot_mode)'")
}

# Enum: log_level
$validLogLevels = @('step', 'action', 'none')
if ($cfg.PSObject.Properties.Name -contains 'log_level' -and
    $cfg.log_level -notin $validLogLevels) {
  $configErrors.Add("'log_level' must be one of: $($validLogLevels -join ', '). Found: '$($cfg.log_level)'")
}

# Report all config errors together
if ($configErrors.Count -gt 0) {
  Write-Log ERROR "$($configErrors.Count) config validation error(s) found:" 'CONFIG'
  for ($i = 0; $i -lt $configErrors.Count; $i++) {
    Write-Log ERROR "  [$($i + 1)] $($configErrors[$i])" 'CONFIG'
  }
  Write-Log ERROR "Fix all errors in: $ConfigPath" 'CONFIG'
  exit $EXIT_CONFIG
}

Write-Log INFO 'Config field validation passed.' 'CONFIG'

# ---------------------------------------------------------------------------
# PHASE 5 — Environment variables  (aggregated; report all missing vars at once)
# ---------------------------------------------------------------------------
Write-Log INFO 'Checking required environment variables...' 'ENV'

# APP_BASE_URL: prefer config value, fall back to environment variable
$appBaseUrlValue = if (-not [string]::IsNullOrWhiteSpace($cfg.app_base_url)) {
  $cfg.app_base_url
} else {
  [System.Environment]::GetEnvironmentVariable('APP_BASE_URL')
}
if ([string]::IsNullOrWhiteSpace($appBaseUrlValue)) {
  $envErrors.Add("APP_BASE_URL not found — set 'app_base_url' in workflow-input.current.json or the APP_BASE_URL environment variable.")
}

# ADO credentials: prefer config value, fall back to environment variable
if ($cfg.input_source -eq 'ado' -or $cfg.run_mode -eq 'execute') {
  $adoFieldMap = [ordered]@{
    'ADO_PAT'     = if ($cfg.PSObject.Properties.Name -contains 'ado_pat'     -and -not [string]::IsNullOrWhiteSpace($cfg.ado_pat))     { $cfg.ado_pat }     else { [System.Environment]::GetEnvironmentVariable('ADO_PAT') }
    'ADO_ORG'     = if ($cfg.PSObject.Properties.Name -contains 'ado_org'     -and -not [string]::IsNullOrWhiteSpace($cfg.ado_org))     { $cfg.ado_org }     else { [System.Environment]::GetEnvironmentVariable('ADO_ORG') }
    'ADO_PROJECT' = if ($cfg.PSObject.Properties.Name -contains 'ado_project' -and -not [string]::IsNullOrWhiteSpace($cfg.ado_project)) { $cfg.ado_project } else { [System.Environment]::GetEnvironmentVariable('ADO_PROJECT') }
  }
  foreach ($entry in $adoFieldMap.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace($entry.Value)) {
      $envErrors.Add("$($entry.Key) not found — set the corresponding field (ado_pat/ado_org/ado_project) in workflow-input.current.json or the $($entry.Key) environment variable. (required when input_source='ado' or run_mode='execute')")
    }
  }
}

# App credentials: prefer config value, fall back to environment variable
if ($cfg.app_auth_strategy -eq 'env-var') {
  $credFieldMap = [ordered]@{
    'APP_USERNAME' = if ($cfg.PSObject.Properties.Name -contains 'app_username' -and -not [string]::IsNullOrWhiteSpace($cfg.app_username)) { $cfg.app_username } else { [System.Environment]::GetEnvironmentVariable('APP_USERNAME') }
    'APP_PASSWORD' = if ($cfg.PSObject.Properties.Name -contains 'app_password' -and -not [string]::IsNullOrWhiteSpace($cfg.app_password)) { $cfg.app_password } else { [System.Environment]::GetEnvironmentVariable('APP_PASSWORD') }
  }
  foreach ($entry in $credFieldMap.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace($entry.Value)) {
      $envErrors.Add("app_auth_strategy is 'env-var' but $($entry.Key) not found — set '$($entry.Key.ToLower().Replace('_', '_'))' in workflow-input.current.json or the $($entry.Key) environment variable.")
    }
  }
}

if ($envErrors.Count -gt 0) {
  Write-Log ERROR "$($envErrors.Count) environment variable error(s) found:" 'ENV'
  for ($i = 0; $i -lt $envErrors.Count; $i++) {
    Write-Log ERROR "  [$($i + 1)] $($envErrors[$i])" 'ENV'
  }
  exit $EXIT_ENVIRONMENT
}

Write-Log INFO 'Environment variable checks passed.' 'ENV'

# ---------------------------------------------------------------------------
# PHASE 5b — ImportExcel module  (only when raw_input_file is a .xlsx workbook)
#             The testcase-excel-to-rawinput skill reads the Test Cases
#             workflow Excel with ImportExcel. Check for it and install on
#             demand — same auto-install pattern used for npm dependencies.
# ---------------------------------------------------------------------------
$needsImportExcel = $false
if ($resolvedInputSource -eq 'raw-file' -and
    $cfg.PSObject.Properties.Name -contains 'raw_input_file' -and
    -not [string]::IsNullOrWhiteSpace($cfg.raw_input_file)) {
  if ([System.IO.Path]::GetExtension($cfg.raw_input_file).ToLower() -eq '.xlsx') {
    $needsImportExcel = $true
  }
}

if ($needsImportExcel) {
  Write-Log INFO "raw_input_file is a .xlsx — checking ImportExcel module (required by testcase-excel-to-rawinput)..." 'IMPORTEXCEL'
  if (Get-Module -ListAvailable -Name ImportExcel) {
    Write-Log INFO 'ImportExcel module is already installed.' 'IMPORTEXCEL'
  } else {
    Write-Log INFO 'ImportExcel not installed — installing (Install-Module ImportExcel -Scope CurrentUser -Force)...' 'IMPORTEXCEL'
    try {
      Install-Module -Name ImportExcel -Scope CurrentUser -Force -AllowClobber -ErrorAction Stop
      if (Get-Module -ListAvailable -Name ImportExcel) {
        Write-Log SUCCESS 'ImportExcel installed successfully.' 'IMPORTEXCEL'
      } else {
        Write-Log WARN "ImportExcel install reported success but the module is still not resolvable. Install it manually: Install-Module ImportExcel -Scope CurrentUser" 'IMPORTEXCEL'
      }
    }
    catch {
      Write-Log WARN "ImportExcel install failed: $($_.Exception.Message)" 'IMPORTEXCEL'
      Write-Log WARN "Install it manually before the build step: Install-Module ImportExcel -Scope CurrentUser -Force" 'IMPORTEXCEL'
    }
  }
} else {
  Write-Log INFO 'raw_input_file is not a .xlsx — skipping ImportExcel module check.' 'IMPORTEXCEL'
}

# ---------------------------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------------------------
$elapsed = ((Get-Date) - $runStartTime).TotalSeconds
Write-Log SUCCESS "All preflight guardrail checks passed. ($([math]::Round($elapsed, 2))s)" 'PREFLIGHT'

# ---------------------------------------------------------------------------
# PHASE 6 — Collect test config values from workflow-input.current.json
#            Values are written to tests/config/test-config.ts at the end
#            of Phase 7 (after the browser executable path is resolved).
# ---------------------------------------------------------------------------
$testConfigValues = [ordered]@{}

$testConfigValues['baseUrl'] = if (-not [string]::IsNullOrWhiteSpace($cfg.app_base_url)) {
  $cfg.app_base_url
} else {
  [System.Environment]::GetEnvironmentVariable('APP_BASE_URL') ?? ''
}

if ($cfg.app_auth_strategy -eq 'env-var') {
  $testConfigValues['username'] = if ($cfg.PSObject.Properties.Name -contains 'app_username' -and -not [string]::IsNullOrWhiteSpace($cfg.app_username)) {
    $cfg.app_username
  } else {
    [System.Environment]::GetEnvironmentVariable('APP_USERNAME') ?? ''
  }
  $testConfigValues['password'] = if ($cfg.PSObject.Properties.Name -contains 'app_password' -and -not [string]::IsNullOrWhiteSpace($cfg.app_password)) {
    $cfg.app_password
  } else {
    [System.Environment]::GetEnvironmentVariable('APP_PASSWORD') ?? ''
  }
}

Write-Log INFO 'Test config values collected from workflow-input.current.json — baseUrl, username, password.' 'CONFIG-WRITE'

# ---------------------------------------------------------------------------
# PHASE 7 — Playwright package check and install
#            Applies regardless of playwright_project_mode.
#            Non-fatal: logs warnings on failure rather than aborting.
# ---------------------------------------------------------------------------
Write-Log INFO 'Checking Playwright package installation...' 'PLAYWRIGHT'

# Resolve the Playwright project root (directory that owns package.json)
$playwrightRoot  = $null
$projectMode     = if ($cfg.PSObject.Properties.Name -contains 'playwright_project_mode') { $cfg.playwright_project_mode } else { 'new' }

if ($projectMode -eq 'existing' -and
    $cfg.PSObject.Properties.Name -contains 'playwright_config_path' -and
    -not [string]::IsNullOrWhiteSpace($cfg.playwright_config_path)) {

  # Walk up from playwright_config_path to find the nearest package.json
  $configDir = Split-Path $cfg.playwright_config_path -Parent
  $searchDir = if ([System.IO.Path]::IsPathRooted($configDir)) {
    $configDir
  } else {
    Join-Path $PSScriptRoot $configDir
  }
  while (-not [string]::IsNullOrWhiteSpace($searchDir) -and (Test-Path $searchDir)) {
    if (Test-Path (Join-Path $searchDir 'package.json')) {
      $playwrightRoot = $searchDir
      break
    }
    $parent = Split-Path $searchDir -Parent
    if ($parent -eq $searchDir) { break }
    $searchDir = $parent
  }

} else {
  # New project mode: artifacts directory generated alongside this script
  $candidateRoot = Resolve-Path (Join-Path $PSScriptRoot '../artifacts') -ErrorAction SilentlyContinue
  if ($candidateRoot -and (Test-Path $candidateRoot.Path)) {
    $playwrightRoot = $candidateRoot.Path
  }
}

if ($null -eq $playwrightRoot -or -not (Test-Path (Join-Path $playwrightRoot 'package.json'))) {
  Write-Log INFO 'Skipping Playwright package check — no package.json found yet. Generate tests first, then re-run preflight.' 'PLAYWRIGHT'
} else {
  Write-Log INFO "Playwright project root resolved: $playwrightRoot" 'PLAYWRIGHT'

  # ---- npm packages --------------------------------------------------------
  $playwrightPkgPath = Join-Path $playwrightRoot 'node_modules' '@playwright' 'test'

  if (-not (Test-Path $playwrightPkgPath)) {
    Write-Log INFO '@playwright/test not installed — running npm install...' 'PLAYWRIGHT'
    Push-Location $playwrightRoot
    try {
      npm install 2>&1 | Out-Null
      if ($LASTEXITCODE -ne 0) {
        Write-Log WARN "npm install completed with warnings (exit $LASTEXITCODE). Check node_modules manually." 'PLAYWRIGHT'
      } else {
        Write-Log SUCCESS 'npm install completed successfully.' 'PLAYWRIGHT'
      }
    }
    catch {
      Write-Log WARN "npm install failed: $($_.Exception.Message)" 'PLAYWRIGHT'
    }
    finally {
      Pop-Location
    }
  } else {
    Write-Log INFO '@playwright/test is already installed.' 'PLAYWRIGHT'
  }

  # ---- API layer dependencies ---------------------------------------------
  # Runs only when api_layer.enabled is true. Installs zod (runtime),
  # typescript + @types/node (dev) so the generated tests/api/* compiles.
  $apiLayerEnabled = $false
  if ($cfg.PSObject.Properties.Name -contains 'api_layer' -and $null -ne $cfg.api_layer) {
    if ($cfg.api_layer.PSObject.Properties.Name -contains 'enabled') {
      $apiLayerEnabled = [bool]$cfg.api_layer.enabled
    }
  }

  if ($apiLayerEnabled) {
    Write-Log INFO 'api_layer.enabled = true — checking API layer dependencies...' 'API-LAYER'

    # name → @types kind: 'runtime' installs into dependencies, 'dev' into devDependencies
    $apiDeps = @(
      @{ name = 'zod';         kind = 'runtime' }
      @{ name = 'typescript';  kind = 'dev'     }
      @{ name = '@types/node'; kind = 'dev'     }
    )

    $missing = @()
    foreach ($dep in $apiDeps) {
      # @types/node lives under node_modules/@types/node; zod under node_modules/zod
      $depPath = Join-Path $playwrightRoot (Join-Path 'node_modules' ($dep.name -replace '/', [IO.Path]::DirectorySeparatorChar))
      if (-not (Test-Path (Join-Path $depPath 'package.json'))) {
        $missing += $dep
        Write-Log INFO "  Missing: $($dep.name)" 'API-LAYER'
      } else {
        Write-Log INFO "  Present: $($dep.name)" 'API-LAYER'
      }
    }

    if ($missing.Count -gt 0) {
      Push-Location $playwrightRoot
      try {
        $runtime = @($missing | Where-Object { $_.kind -eq 'runtime' } | ForEach-Object { $_.name })
        $dev     = @($missing | Where-Object { $_.kind -eq 'dev'     } | ForEach-Object { $_.name })

        if ($runtime.Count -gt 0) {
          Write-Log INFO "Installing runtime deps: $($runtime -join ', ')" 'API-LAYER'
          npm install --save @runtime 2>&1 | Out-Null
          if ($LASTEXITCODE -ne 0) {
            Write-Log WARN "npm install --save returned exit $LASTEXITCODE." 'API-LAYER'
          }
        }
        if ($dev.Count -gt 0) {
          Write-Log INFO "Installing dev deps: $($dev -join ', ')" 'API-LAYER'
          npm install --save-dev @dev 2>&1 | Out-Null
          if ($LASTEXITCODE -ne 0) {
            Write-Log WARN "npm install --save-dev returned exit $LASTEXITCODE." 'API-LAYER'
          }
        }
        Write-Log SUCCESS 'API layer dependencies installed.' 'API-LAYER'
      }
      catch {
        Write-Log WARN "API layer dependency install failed: $($_.Exception.Message)" 'API-LAYER'
      }
      finally {
        Pop-Location
      }
    } else {
      Write-Log INFO 'All API layer dependencies already present.' 'API-LAYER'
    }
  } else {
    Write-Log INFO 'api_layer.enabled is false or absent — skipping API layer dependency check.' 'API-LAYER'
  }

  # ---- browser binaries ----------------------------------------------------
  # Skip download entirely — locate an existing Chrome/Chromium installation.
  # Search order: Playwright cache → system Chrome → system Edge (last resort)
  Write-Log INFO 'Locating an installed Chrome/Chromium binary...' 'PLAYWRIGHT'

  $chromeCandidates = [System.Collections.Generic.List[string]]::new()

  # 1. Playwright global cache — any chromium-* already present, skip headless-shell
  $globalCache  = Join-Path $env:LOCALAPPDATA 'ms-playwright'
  $cachedChrome = Get-ChildItem $globalCache -Recurse -Filter 'chrome.exe' -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'headless' } |
    Select-Object -First 1
  if ($null -ne $cachedChrome) { $chromeCandidates.Add($cachedChrome.FullName) }

  # 2. System Chrome (64-bit, 32-bit, per-user)
  $pf86 = [System.Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
  foreach ($candidate in @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $pf86             'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
  )) {
    if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path $candidate)) {
      $chromeCandidates.Add($candidate)
    }
  }

  # 3. Microsoft Edge (Chromium-based, available on all modern Windows machines)
  foreach ($candidate in @(
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $pf86             'Microsoft\Edge\Application\msedge.exe')
  )) {
    if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path $candidate)) {
      $chromeCandidates.Add($candidate)
    }
  }

  $resolvedBinary = $chromeCandidates | Select-Object -First 1

  if ($null -ne $resolvedBinary) {
    Write-Log INFO "Found browser binary: $resolvedBinary" 'PLAYWRIGHT'
    Write-Log SUCCESS "System browser available — playwright.config.ts uses channel:'chrome' (system-installed Google Chrome)." 'PLAYWRIGHT'
  } else {
    # Nothing found — look up what version Playwright expects and give download instructions
    $requiredRevision  = 'XXXX'
    $requiredChromeVer = ''
    $browsersJsonPath  = Join-Path $playwrightRoot 'node_modules' 'playwright-core' 'browsers.json'
    if (Test-Path $browsersJsonPath) {
      $chromiumEntry = (Get-Content $browsersJsonPath -Raw | ConvertFrom-Json).browsers |
        Where-Object { $_.name -eq 'chromium' -and $_.installByDefault -eq $true } |
        Select-Object -First 1
      if ($chromiumEntry) {
        $requiredRevision  = $chromiumEntry.revision
        $requiredChromeVer = $chromiumEntry.browserVersion
      }
    }
    $expectedDir  = Join-Path $env:LOCALAPPDATA 'ms-playwright' "chromium-$requiredRevision" 'chrome-win'
    $downloadUrl  = "https://cdn.playwright.dev/builds/cft/$requiredChromeVer/win64/chrome-win64.zip"
    $versionLabel = if ($requiredChromeVer) { "Chrome $requiredChromeVer (revision $requiredRevision)" } else { "revision $requiredRevision" }

    Write-Log WARN 'No Chrome/Chromium installation found on this machine.' 'PLAYWRIGHT'
    Write-Log WARN "  Required version : $versionLabel" 'PLAYWRIGHT'
    Write-Log WARN '  Option 1 — Download and place at the expected location:' 'PLAYWRIGHT'
    Write-Log WARN "    URL    : $downloadUrl" 'PLAYWRIGHT'
    Write-Log WARN "    Folder : $expectedDir" 'PLAYWRIGHT'
    Write-Log WARN "    File   : chrome.exe  →  re-run preflight to auto-detect." 'PLAYWRIGHT'
    Write-Log WARN '  Option 2 — Set executablePath in tests/config/test-config.ts to any existing chrome.exe.' 'PLAYWRIGHT'
    Write-Log WARN "  Option 3 — Browse versions: https://googlechromelabs.github.io/chrome-for-testing/" 'PLAYWRIGHT'
  }

  # ---- Write tests/config/test-config.ts -----------------------------------
  # Contains all runtime values sourced from workflow-input.current.json.
  # This file is auto-generated — add it to .gitignore; re-run preflight to refresh.
  $testConfigPath = Join-Path $playwrightRoot 'tests' 'config' 'test-config.ts'
  try {
    $tsLines = [System.Collections.Generic.List[string]]::new()
    $tsLines.Add('// tests/config/test-config.ts')
    $tsLines.Add('// AUTO-GENERATED by preflight-guardrails.ps1 — DO NOT COMMIT this file.')
    $tsLines.Add("// Source: $ConfigPath")
    $tsLines.Add('// Re-generate: pwsh ui/scripts/preflight-guardrails.ps1')
    $tsLines.Add('')
    $tsLines.Add('export const config = {')
    foreach ($entry in $testConfigValues.GetEnumerator()) {
      $escaped = ConvertTo-TsString $entry.Value
      $tsLines.Add("  $($entry.Key): '$escaped',")
    }
    $tsLines.Add('} as const;')

    $tsLines | Set-Content -Path $testConfigPath -Encoding UTF8
    Write-Log SUCCESS "test-config.ts written: $testConfigPath" 'CONFIG-WRITE'
  }
  catch {
    Write-Log WARN "Could not write test-config.ts: $($_.Exception.Message)" 'CONFIG-WRITE'
  }
}

exit $EXIT_OK

