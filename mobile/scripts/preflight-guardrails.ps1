param(
  [string]$ConfigPath        = "$PSScriptRoot/../config/workflow-input.current.json",
  [string]$AdoGuardrailsPath = "$PSScriptRoot/../config/ado-operation-guardrails.json",
  [string]$EnvOutputPath     = "$PSScriptRoot/../artifacts/.env",
  [switch]$InstallDeps,
  [switch]$StrictPrereqs
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
$EXIT_PREREQ      = 5   # Required tooling prerequisite missing (only with -StrictPrereqs)

# ---------------------------------------------------------------------------
# Structured logger
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

$configErrors = [System.Collections.Generic.List[string]]::new()
$envErrors    = [System.Collections.Generic.List[string]]::new()
$runStartTime = Get-Date

# ---------------------------------------------------------------------------
# PHASE 1 — File access (fail-fast)
# ---------------------------------------------------------------------------
Write-Log INFO 'Starting preflight guardrail checks.' 'PREFLIGHT'

try {
  if (-not (Test-Path $ConfigPath)) { throw "Config file not found: $ConfigPath" }
  Write-Log INFO "Config file resolved: $ConfigPath" 'FILE'
}
catch {
  Write-Log ERROR $_.Exception.Message 'FILE'
  Write-Log ERROR "Preflight aborted — cannot locate workflow config." 'PREFLIGHT'
  exit $EXIT_FILE
}

try {
  if (-not (Test-Path $AdoGuardrailsPath)) { throw "ADO guardrails file not found: $AdoGuardrailsPath" }
  Write-Log INFO "Guardrails file resolved: $AdoGuardrailsPath" 'FILE'
}
catch {
  Write-Log ERROR $_.Exception.Message 'FILE'
  Write-Log ERROR "Preflight aborted — cannot locate ADO guardrails config." 'PREFLIGHT'
  exit $EXIT_FILE
}

# ---------------------------------------------------------------------------
# PHASE 2 — JSON parsing (fail-fast)
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
# PHASE 3 — Security guardrail constants (fail-fast; hard stops)
# ---------------------------------------------------------------------------
Write-Log INFO 'Checking ADO security guardrail constants...' 'GUARDRAIL'

try {
  if (-not $adoGuard.failClosed) { throw 'ADO guardrails must be fail-closed (failClosed: true).' }
  if ($adoGuard.mode -ne 'read-only') { throw "ADO guardrails mode must be read-only. Found: $($adoGuard.mode)" }
  if (-not $adoGuard.blockedWriteOperations -or $adoGuard.blockedWriteOperations.Count -lt 1) { throw 'blockedWriteOperations must be defined and non-empty.' }
  if (-not $adoGuard.allowedReadOperations -or $adoGuard.allowedReadOperations.Count -lt 1) { throw 'allowedReadOperations must be defined and non-empty.' }
  if ($cfg.allow_ado_mutation -ne $false) { throw "allow_ado_mutation must be false. Found: $($cfg.allow_ado_mutation)" }
  if ($cfg.allow_probe_resources -ne $false) { throw "allow_probe_resources must be false. Found: $($cfg.allow_probe_resources)" }
  if ($cfg.ado_access_mode -ne 'read-only') { throw "ado_access_mode must be read-only. Found: $($cfg.ado_access_mode)" }
  if ($cfg.ado_tool_calls_mode -ne 'read-wrapper-only') { throw "ado_tool_calls_mode must be read-wrapper-only. Found: $($cfg.ado_tool_calls_mode)" }
  if ($cfg.ado_write_tools_disabled -ne $true) { throw "ado_write_tools_disabled must be true. Found: $($cfg.ado_write_tools_disabled)" }
  Write-Log INFO 'ADO security guardrail constants passed.' 'GUARDRAIL'
}
catch {
  Write-Log ERROR "GUARDRAIL VIOLATION — $($_.Exception.Message)" 'GUARDRAIL'
  Write-Log ERROR 'Preflight aborted. A security guardrail constant was violated.' 'PREFLIGHT'
  exit $EXIT_GUARDRAIL
}

# ---------------------------------------------------------------------------
# PHASE 4 — Config field validation (aggregated)
# ---------------------------------------------------------------------------
Write-Log INFO 'Validating workflow config fields...' 'CONFIG'

$requiredFields = @(
  'platform', 'appium_server_url', 'app_auth_strategy', 'test_output_path',
  'input_source', 'run_mode',
  'allow_ado_mutation', 'allow_probe_resources',
  'ado_access_mode', 'ado_tool_calls_mode', 'ado_write_tools_disabled'
)
foreach ($field in $requiredFields) {
  if (-not ($cfg.PSObject.Properties.Name -contains $field)) {
    $configErrors.Add("Missing required field: '$field'")
  }
}

# Non-empty string checks
$nonEmptyChecks = @{
  appium_server_url = $cfg.PSObject.Properties.Name -contains 'appium_server_url' ? $cfg.appium_server_url : $null
  app_auth_strategy = $cfg.PSObject.Properties.Name -contains 'app_auth_strategy' ? $cfg.app_auth_strategy : $null
  test_output_path  = $cfg.PSObject.Properties.Name -contains 'test_output_path'  ? $cfg.test_output_path  : $null
}
foreach ($entry in $nonEmptyChecks.GetEnumerator()) {
  if ($null -ne $entry.Value -and [string]::IsNullOrWhiteSpace($entry.Value)) {
    $configErrors.Add("Field '$($entry.Key)' must not be empty.")
  }
}

# Enum: platform
$validPlatforms = @('android', 'ios')
$resolvedPlatform = $null
if ($cfg.PSObject.Properties.Name -contains 'platform') {
  if ($cfg.platform -notin $validPlatforms) {
    $configErrors.Add("'platform' must be one of: $($validPlatforms -join ', '). Found: '$($cfg.platform)'")
  } else {
    $resolvedPlatform = $cfg.platform
  }
}

# Platform-specific app identity: android needs app_package (+ app_activity) or app_path;
# ios needs bundle_id or app_path.
function Has([string]$name) { return ($cfg.PSObject.Properties.Name -contains $name) -and -not [string]::IsNullOrWhiteSpace($cfg.$name) }

# Enum: execution_target (default local when absent)
$validExecTargets = @('local', 'browserstack')
$resolvedExecTarget = 'local'
if ($cfg.PSObject.Properties.Name -contains 'execution_target') {
  if ($cfg.execution_target -notin $validExecTargets) {
    $configErrors.Add("'execution_target' must be one of: $($validExecTargets -join ', '). Found: '$($cfg.execution_target)'")
  } else {
    $resolvedExecTarget = $cfg.execution_target
  }
}

# BrowserStack sub-object helper
$bs = if ($cfg.PSObject.Properties.Name -contains 'browserstack') { $cfg.browserstack } else { $null }
function BsHas([string]$name) { return ($null -ne $bs) -and ($bs.PSObject.Properties.Name -contains $name) -and -not [string]::IsNullOrWhiteSpace($bs.$name) }

if ($resolvedExecTarget -eq 'local') {
  # App identity is required locally (the app must be installed or supplied as a binary).
  if ($resolvedPlatform -eq 'android') {
    if (-not (Has 'app_package') -and -not (Has 'app_path')) {
      $configErrors.Add("Android (local) requires 'app_package' (+ 'app_activity') or 'app_path' (path to .apk).")
    }
  } elseif ($resolvedPlatform -eq 'ios') {
    if (-not (Has 'bundle_id') -and -not (Has 'app_path')) {
      $configErrors.Add("iOS (local) requires 'bundle_id' or 'app_path' (path to .app/.ipa).")
    }
  }
} elseif ($resolvedExecTarget -eq 'browserstack') {
  # BrowserStack requires device + os_version and a hosted app (app_id) or a binary to upload.
  if ($null -eq $bs) {
    $configErrors.Add("'browserstack' object is required when 'execution_target' is 'browserstack'.")
  } else {
    if (-not (BsHas 'device'))     { $configErrors.Add("'browserstack.device' is required when 'execution_target' is 'browserstack'.") }
    if (-not (BsHas 'os_version')) { $configErrors.Add("'browserstack.os_version' is required when 'execution_target' is 'browserstack'.") }
    if (-not (BsHas 'app_id') -and -not (BsHas 'app_path_upload')) {
      $configErrors.Add("BrowserStack requires 'browserstack.app_id' (bs://<hash>) or 'browserstack.app_path_upload' (local .apk/.ipa to upload).")
    }
    if ((BsHas 'app_path_upload') -and -not (Test-Path $bs.app_path_upload)) {
      $configErrors.Add("'browserstack.app_path_upload' not found on disk: '$($bs.app_path_upload)'")
    }
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
  if (-not (Has 'raw_input_file')) {
    $configErrors.Add("'raw_input_file' is required when 'input_source' is 'raw-file'.")
  } else {
    $rawFileExt = [System.IO.Path]::GetExtension($cfg.raw_input_file).ToLower()
    if ($rawFileExt -notin @('.md', '.txt', '.json', '.xlsx')) {
      $configErrors.Add("'raw_input_file' must be a .md, .txt, .json, or .xlsx (Test Cases workflow output) file. Found extension: '$rawFileExt'")
    } elseif (-not (Test-Path $cfg.raw_input_file)) {
      $configErrors.Add("'raw_input_file' not found on disk: '$($cfg.raw_input_file)'")
    }
  }
} elseif ($resolvedInputSource -eq 'ado') {
  $hasUserStoryLink = (Has 'user_story_ado_link')
  $hasUserStoryId   = ($cfg.PSObject.Properties.Name -contains 'user_story_id') -and $null -ne $cfg.user_story_id
  if (-not $hasUserStoryLink -and -not $hasUserStoryId) {
    $configErrors.Add("'user_story_ado_link' or 'user_story_id' is required when 'input_source' is 'ado'.")
  }
  $hasTestCasesLink = (Has 'test_cases_ado_link')
  $hasTestPlanSuite = (($cfg.PSObject.Properties.Name -contains 'test_plan_id') -and $null -ne $cfg.test_plan_id) -and
                      (($cfg.PSObject.Properties.Name -contains 'test_suite_id') -and $null -ne $cfg.test_suite_id)
  if (-not $hasTestCasesLink -and -not $hasTestPlanSuite) {
    $configErrors.Add("'test_cases_ado_link' or the 'test_plan_id'+'test_suite_id' pair is required when 'input_source' is 'ado'.")
  }
}

# Enum: app_auth_strategy
$validAuthStrategies = @('none', 'env-var')
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
  foreach ($field in @('reviewer_ado_user_id', 'target_repo', 'target_branch')) {
    if (-not ($cfg.PSObject.Properties.Name -contains $field)) {
      $configErrors.Add("Missing required field: '$field' (required when 'run_mode' is 'execute')")
    } elseif ([string]::IsNullOrWhiteSpace($cfg.$field)) {
      $configErrors.Add("Field '$field' must not be empty (required when 'run_mode' is 'execute').")
    }
  }
}

# Enum: robot_project_mode
$validProjectModes = @('new', 'existing')
if ($cfg.PSObject.Properties.Name -contains 'robot_project_mode') {
  if ($cfg.robot_project_mode -notin $validProjectModes) {
    $configErrors.Add("'robot_project_mode' must be one of: $($validProjectModes -join ', '). Found: '$($cfg.robot_project_mode)'")
  }
  elseif ($cfg.robot_project_mode -eq 'existing') {
    if (-not (Has 'robot_config_path')) {
      $configErrors.Add("'robot_config_path' is required when 'robot_project_mode' is 'existing'.")
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
# PHASE 5 — Environment variables (aggregated)
# ---------------------------------------------------------------------------
Write-Log INFO 'Checking required environment variables...' 'ENV'

# Resolve the effective Appium endpoint. For BrowserStack the hub URL takes precedence.
$bsUserValue = $null
$bsKeyValue  = $null
if ($resolvedExecTarget -eq 'browserstack') {
  $appiumUrlValue = if (BsHas 'hub_url') { $bs.hub_url } else { 'https://hub-cloud.browserstack.com/wd/hub' }

  # BrowserStack credentials: prefer config sub-object, fall back to env.
  $bsUserValue = if (BsHas 'username')   { $bs.username }   else { [System.Environment]::GetEnvironmentVariable('BROWSERSTACK_USERNAME') }
  $bsKeyValue  = if (BsHas 'access_key') { $bs.access_key } else { [System.Environment]::GetEnvironmentVariable('BROWSERSTACK_ACCESS_KEY') }
  if ([string]::IsNullOrWhiteSpace($bsUserValue)) {
    $envErrors.Add("BROWSERSTACK_USERNAME not found — set 'browserstack.username' in workflow-input.current.json or the BROWSERSTACK_USERNAME environment variable. (required when execution_target='browserstack')")
  }
  if ([string]::IsNullOrWhiteSpace($bsKeyValue)) {
    $envErrors.Add("BROWSERSTACK_ACCESS_KEY not found — set 'browserstack.access_key' in workflow-input.current.json or the BROWSERSTACK_ACCESS_KEY environment variable. (required when execution_target='browserstack')")
  }
} else {
  # local: APPIUM_SERVER_URL — prefer config, fall back to env.
  $appiumUrlValue = if (-not [string]::IsNullOrWhiteSpace($cfg.appium_server_url)) {
    $cfg.appium_server_url
  } else {
    [System.Environment]::GetEnvironmentVariable('APPIUM_SERVER_URL')
  }
  if ([string]::IsNullOrWhiteSpace($appiumUrlValue)) {
    $envErrors.Add("APPIUM_SERVER_URL not found — set 'appium_server_url' in workflow-input.current.json or the APPIUM_SERVER_URL environment variable.")
  }
}

# ADO credentials
if ($cfg.input_source -eq 'ado' -or $cfg.run_mode -eq 'execute') {
  $adoFieldMap = [ordered]@{
    'ADO_PAT'     = if ((Has 'ado_pat'))     { $cfg.ado_pat }     else { [System.Environment]::GetEnvironmentVariable('ADO_PAT') }
    'ADO_ORG'     = if ((Has 'ado_org'))     { $cfg.ado_org }     else { [System.Environment]::GetEnvironmentVariable('ADO_ORG') }
    'ADO_PROJECT' = if ((Has 'ado_project')) { $cfg.ado_project } else { [System.Environment]::GetEnvironmentVariable('ADO_PROJECT') }
  }
  foreach ($entry in $adoFieldMap.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace($entry.Value)) {
      $envErrors.Add("$($entry.Key) not found — set the corresponding field (ado_pat/ado_org/ado_project) in workflow-input.current.json or the $($entry.Key) environment variable. (required when input_source='ado' or run_mode='execute')")
    }
  }
}

# App credentials
if ($cfg.app_auth_strategy -eq 'env-var') {
  $credFieldMap = [ordered]@{
    'APP_USERNAME' = if ((Has 'app_username')) { $cfg.app_username } else { [System.Environment]::GetEnvironmentVariable('APP_USERNAME') }
    'APP_PASSWORD' = if ((Has 'app_password')) { $cfg.app_password } else { [System.Environment]::GetEnvironmentVariable('APP_PASSWORD') }
  }
  foreach ($entry in $credFieldMap.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace($entry.Value)) {
      $envErrors.Add("app_auth_strategy is 'env-var' but $($entry.Key) not found — set '$($entry.Key.ToLower())' in workflow-input.current.json or the $($entry.Key) environment variable.")
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
# PHASE 5b — ImportExcel module (only when raw_input_file is a .xlsx workbook)
# ---------------------------------------------------------------------------
$needsImportExcel = $false
if ($resolvedInputSource -eq 'raw-file' -and (Has 'raw_input_file')) {
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
      Write-Log SUCCESS 'ImportExcel installed successfully.' 'IMPORTEXCEL'
    }
    catch {
      Write-Log WARN "ImportExcel install failed: $($_.Exception.Message). Install manually: Install-Module ImportExcel -Scope CurrentUser -Force" 'IMPORTEXCEL'
    }
  }
}

# ---------------------------------------------------------------------------
# PHASE 5c — Tooling prerequisites (Python, Robot Framework, Appium & drivers)
#            Verifies every tool required to run the generated suite is present.
#            Reports each as OK / MISSING with the exact install command.
#            -InstallDeps auto-installs what it can. -StrictPrereqs turns any
#            missing REQUIRED prerequisite into a hard failure (exit 5);
#            otherwise missing tools are warnings so dry-run generation can
#            still proceed. Appium server/driver/adb/Xcode checks are skipped
#            for execution_target=browserstack (the device farm is remote).
# ---------------------------------------------------------------------------
Write-Log INFO 'Checking tooling prerequisites (Python, Robot Framework, Appium, drivers)...' 'PREREQ'

$prereqMissing = [System.Collections.Generic.List[string]]::new()   # required-but-missing
$prereqWarn    = [System.Collections.Generic.List[string]]::new()   # optional-but-missing

function Get-Cmd([string]$name) { return Get-Command $name -ErrorAction SilentlyContinue }
function Get-ToolVersion([string]$exe, [string[]]$vArgs) {
  try { return (& $exe @vArgs 2>&1 | Select-Object -First 1) } catch { return $null }
}

# --- Python 3.9+ (required) ---
$python = (Get-Cmd 'python') ?? (Get-Cmd 'python3')
$pyOk = $false
if (-not $python) {
  $prereqMissing.Add("Python 3.9+ not found on PATH. Install from https://www.python.org/downloads/ (ensure 'Add to PATH').")
} else {
  $pyVerRaw = Get-ToolVersion $python.Source @('--version')
  if ($pyVerRaw -match '(\d+)\.(\d+)\.(\d+)') {
    $maj = [int]$Matches[1]; $min = [int]$Matches[2]
    if ($maj -gt 3 -or ($maj -eq 3 -and $min -ge 9)) {
      $pyOk = $true
      Write-Log SUCCESS "Python OK — $pyVerRaw ($($python.Source))" 'PREREQ'
    } else {
      $prereqMissing.Add("Python $maj.$min found but 3.9+ is required. Upgrade Python.")
    }
  } else {
    $prereqWarn.Add("Could not determine Python version from '$pyVerRaw'. Ensure Python 3.9+ is installed.")
  }
}

# --- pip (required when Python present) ---
if ($pyOk) {
  $pipVer = Get-ToolVersion $python.Source @('-m', 'pip', '--version')
  if ($pipVer -match 'pip') {
    Write-Log SUCCESS "pip OK — $pipVer" 'PREREQ'
  } else {
    $prereqMissing.Add("pip not available for the selected Python. Install with: $($python.Source) -m ensurepip --upgrade")
  }
}

# --- Python packages: Robot Framework + AppiumLibrary + Appium-Python-Client (required) ---
# pip distribution name -> import module name used to verify installation.
$pyPkgs = [ordered]@{
  'robotframework'               = 'robot'
  'robotframework-appiumlibrary' = 'AppiumLibrary'
  'Appium-Python-Client'         = 'appium'
}
$missingPyPkgs = [System.Collections.Generic.List[string]]::new()
if ($pyOk) {
  foreach ($pkg in $pyPkgs.GetEnumerator()) {
    $mod = $pkg.Value
    $probe = & $python.Source -c "import importlib,sys; m=importlib.import_module('$mod'); print(getattr(m,'__version__',''))" 2>$null
    if ($LASTEXITCODE -eq 0) {
      $ver = if ([string]::IsNullOrWhiteSpace($probe)) { 'installed' } else { "v$probe" }
      Write-Log SUCCESS "Python package OK — $($pkg.Key) ($ver)" 'PREREQ'
    } else {
      $missingPyPkgs.Add($pkg.Key)
      Write-Log WARN "Python package MISSING — $($pkg.Key)" 'PREREQ'
    }
  }
}

# --- Node.js + npm + Appium CLI + drivers (required for local only) ---
$needsAppiumServer = ($resolvedExecTarget -eq 'local')
if ($needsAppiumServer) {
  $node = Get-Cmd 'node'
  if ($node) { Write-Log SUCCESS "Node.js OK — $(Get-ToolVersion $node.Source @('--version'))" 'PREREQ' }
  else { $prereqMissing.Add("Node.js not found (needed for the local Appium server). Install from https://nodejs.org/ (LTS).") }

  $npm = Get-Cmd 'npm'
  if (-not $npm) { $prereqWarn.Add("npm not found — required to install Appium and its drivers.") }

  $appium = Get-Cmd 'appium'
  $appiumOk = $false
  if ($appium) {
    $appiumOk = $true
    Write-Log SUCCESS "Appium CLI OK — v$(Get-ToolVersion $appium.Source @('--version'))" 'PREREQ'
  } else {
    $prereqMissing.Add("Appium server not found (local target). Install with: npm i -g appium")
  }

  # Appium driver required for the platform
  $requiredDriver = if ($resolvedPlatform -eq 'ios') { 'xcuitest' } else { 'uiautomator2' }
  if ($appiumOk) {
    $driverList = & $appium.Source driver list --installed 2>&1 | Out-String
    if ($driverList -match [regex]::Escape($requiredDriver)) {
      Write-Log SUCCESS "Appium driver OK — $requiredDriver installed" 'PREREQ'
    } else {
      $prereqMissing.Add("Appium '$requiredDriver' driver not installed. Install with: appium driver install $requiredDriver")
    }
  }

  # Platform SDK tooling
  if ($resolvedPlatform -eq 'android') {
    if (Get-Cmd 'adb') { Write-Log SUCCESS "Android adb OK — $(Get-ToolVersion (Get-Cmd 'adb').Source @('version') )" 'PREREQ' }
    else { $prereqMissing.Add("adb not found (Android). Install Android Studio + SDK platform-tools and add them to PATH.") }
  } elseif ($resolvedPlatform -eq 'ios') {
    if (Get-Cmd 'xcrun') { Write-Log SUCCESS "Xcode command-line tools OK (xcrun found)." 'PREREQ' }
    else { $prereqWarn.Add("xcrun not found (iOS). Install Xcode + Command Line Tools (macOS only).") }
  }
} else {
  # BrowserStack: only the Python side is needed locally; app runs in the cloud.
  Write-Log INFO "execution_target=browserstack — skipping local Appium server / driver / adb / Xcode checks." 'PREREQ'
  # 'requests' is used to upload the app binary to BrowserStack when app_path_upload is set.
  if ($pyOk -and (BsHas 'app_path_upload')) {
    & $python.Source -c "import requests" 2>$null
    if ($LASTEXITCODE -ne 0) { $missingPyPkgs.Add('requests') ; Write-Log WARN "Python package MISSING — requests (needed to upload app to BrowserStack)" 'PREREQ' }
    else { Write-Log SUCCESS "Python package OK — requests" 'PREREQ' }
  }
}

# --- Auto-install (opt-in) ---
if ($InstallDeps) {
  if (-not $pyOk) {
    Write-Log WARN "Cannot auto-install Python packages — Python 3.9+ is not available." 'PREREQ'
  } elseif ($missingPyPkgs.Count -gt 0) {
    Write-Log INFO "Installing missing Python packages: $($missingPyPkgs -join ', ')" 'PREREQ'
    try {
      & $python.Source -m pip install --upgrade @($missingPyPkgs)
      Write-Log SUCCESS "Python packages installed: $($missingPyPkgs -join ', ')" 'PREREQ'
      $missingPyPkgs.Clear()
    } catch {
      Write-Log WARN "pip install failed: $($_.Exception.Message). Install manually: $($python.Source) -m pip install $($missingPyPkgs -join ' ')" 'PREREQ'
    }
  }

  if ($needsAppiumServer) {
    $npm = Get-Cmd 'npm'
    if ($npm -and -not (Get-Cmd 'appium')) {
      Write-Log INFO "Installing Appium globally (npm i -g appium)..." 'PREREQ'
      try { & $npm.Source i -g appium; Write-Log SUCCESS "Appium installed." 'PREREQ' }
      catch { Write-Log WARN "Appium install failed: $($_.Exception.Message)" 'PREREQ' }
    }
    $appium = Get-Cmd 'appium'
    $requiredDriver = if ($resolvedPlatform -eq 'ios') { 'xcuitest' } else { 'uiautomator2' }
    if ($appium) {
      $driverList = & $appium.Source driver list --installed 2>&1 | Out-String
      if ($driverList -notmatch [regex]::Escape($requiredDriver)) {
        Write-Log INFO "Installing Appium '$requiredDriver' driver..." 'PREREQ'
        try { & $appium.Source driver install $requiredDriver; Write-Log SUCCESS "Appium '$requiredDriver' driver installed." 'PREREQ' }
        catch { Write-Log WARN "Appium driver install failed: $($_.Exception.Message)" 'PREREQ' }
      }
    }
  }
}

# --- Fold still-missing Python packages into the appropriate bucket ---
foreach ($p in $missingPyPkgs) {
  $prereqMissing.Add("Python package '$p' not installed. Install with: pip install $p")
}

# --- Report & gate ---
if ($prereqWarn.Count -gt 0) {
  Write-Log WARN "$($prereqWarn.Count) optional prerequisite warning(s):" 'PREREQ'
  for ($i = 0; $i -lt $prereqWarn.Count; $i++) { Write-Log WARN "  [$($i + 1)] $($prereqWarn[$i])" 'PREREQ' }
}
if ($prereqMissing.Count -gt 0) {
  Write-Log WARN "$($prereqMissing.Count) required prerequisite(s) missing:" 'PREREQ'
  for ($i = 0; $i -lt $prereqMissing.Count; $i++) { Write-Log WARN "  [$($i + 1)] $($prereqMissing[$i])" 'PREREQ' }
  Write-Log INFO "Tip: run this script with -InstallDeps to auto-install Python packages, Appium, and drivers." 'PREREQ'
  if ($StrictPrereqs) {
    Write-Log ERROR "Preflight aborted — required tooling prerequisites are missing (-StrictPrereqs)." 'PREREQ'
    exit $EXIT_PREREQ
  }
  Write-Log WARN "Continuing (non-strict): dry-run generation can proceed, but live app analysis and test execution will fail until these are installed." 'PREREQ'
} else {
  Write-Log SUCCESS "All required tooling prerequisites satisfied." 'PREREQ'
}

# ---------------------------------------------------------------------------
# PHASE 6 — Emit .env for local Robot/Appium execution
# ---------------------------------------------------------------------------
try {
  $envDir = Split-Path $EnvOutputPath -Parent
  if (-not (Test-Path $envDir)) { New-Item -ItemType Directory -Force -Path $envDir | Out-Null }

  $envLines = [System.Collections.Generic.List[string]]::new()
  $envLines.Add("# Auto-generated by mobile/scripts/preflight-guardrails.ps1 — DO NOT COMMIT")
  function AddEnv([string]$key, $val) { if (-not [string]::IsNullOrWhiteSpace("$val")) { $envLines.Add("$key=$val") } }
  function CfgVal([string]$name) { if ((Has $name)) { return $cfg.$name } else { return $null } }
  function BsVal([string]$name)  { if ((BsHas $name)) { return $bs.$name } else { return $null } }

  AddEnv 'APPIUM_SERVER_URL' $appiumUrlValue
  AddEnv 'EXECUTION_TARGET'  $resolvedExecTarget
  AddEnv 'MOBILE_PLATFORM'   $cfg.platform
  AddEnv 'DEVICE_NAME'       (CfgVal 'device_name')
  AddEnv 'AVD'               (CfgVal 'avd')
  AddEnv 'PLATFORM_VERSION'  (CfgVal 'platform_version')
  AddEnv 'AUTOMATION_NAME'   (CfgVal 'automation_name')
  AddEnv 'APP_PACKAGE'       (CfgVal 'app_package')
  AddEnv 'APP_ACTIVITY'      (CfgVal 'app_activity')
  AddEnv 'BUNDLE_ID'         (CfgVal 'bundle_id')
  AddEnv 'APP_PATH'          (CfgVal 'app_path')
  AddEnv 'APP_VERSION'       (CfgVal 'app_version')

  if ($resolvedExecTarget -eq 'browserstack') {
    AddEnv 'BROWSERSTACK_USERNAME'   $bsUserValue
    AddEnv 'BROWSERSTACK_ACCESS_KEY' $bsKeyValue
    AddEnv 'BROWSERSTACK_HUB_URL'    $appiumUrlValue
    AddEnv 'BS_APP_ID'       (BsVal 'app_id')
    AddEnv 'BS_DEVICE'       (BsVal 'device')
    AddEnv 'BS_OS_VERSION'   (BsVal 'os_version')
    AddEnv 'BS_PROJECT_NAME' (BsVal 'project_name')
    AddEnv 'BS_BUILD_NAME'   (BsVal 'build_name')
  }

  if ($cfg.app_auth_strategy -eq 'env-var') {
    $appUser = if ((Has 'app_username')) { $cfg.app_username } else { [System.Environment]::GetEnvironmentVariable('APP_USERNAME') }
    $appPass = if ((Has 'app_password')) { $cfg.app_password } else { [System.Environment]::GetEnvironmentVariable('APP_PASSWORD') }
    AddEnv 'APP_USERNAME' $appUser
    AddEnv 'APP_PASSWORD' $appPass
  }

  Set-Content -Path $EnvOutputPath -Value ($envLines -join "`n") -Encoding UTF8
  Write-Log INFO ".env written to: $EnvOutputPath (gitignored — contains local run values)" 'ENV'
}
catch {
  Write-Log WARN "Failed to write .env: $($_.Exception.Message)" 'ENV'
}

# ---------------------------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------------------------
$elapsed = ((Get-Date) - $runStartTime).TotalSeconds
Write-Log SUCCESS "All preflight guardrail checks passed. ($([math]::Round($elapsed, 2))s)" 'PREFLIGHT'
exit $EXIT_OK
