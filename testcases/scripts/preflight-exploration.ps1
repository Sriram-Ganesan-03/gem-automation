# preflight-exploration.ps1 - Tooling prerequisites for the optional live-exploration passes.
#
# Runs only when ui_exploration.enabled and/or mobile_exploration.enabled is true in the
# workflow config. Verifies (and, by default, installs) the tooling each pass needs:
#   - ui_exploration      -> Node.js + npm + Playwright CLI + Playwright browsers
#   - mobile_exploration  -> Python 3.9+ + pip + Appium-Python-Client (+ selenium), and for
#                            local runs Node.js + npm + Appium CLI + platform driver
#                            (uiautomator2/xcuitest) + platform SDK tooling (adb / xcrun).
#                            BrowserStack runs skip the local Appium/driver/SDK checks and
#                            verify the 'requests' package instead.
#
# Each prerequisite is reported OK / MISSING with the exact install command. Missing tools are
# installed automatically unless -InstallDeps:$false. With -StrictPrereqs, any missing REQUIRED
# prerequisite is a hard failure (exit 5); otherwise missing tools are warnings so dry-run
# generation can still proceed (the intake pass records the limitation as unresolved).
#
# Exit codes: 0 = ok / nothing to do, 1 = file/parse error, 5 = required prereq missing (-StrictPrereqs).

param(
  [string]$ConfigPath = "$PSScriptRoot/../config/workflow-input.current.json",
  [bool]$InstallDeps  = $true,
  [switch]$StrictPrereqs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$EXIT_OK = 0; $EXIT_FILE = 1; $EXIT_PREREQ = 5

function Write-Log {
  param(
    [ValidateSet('INFO','WARN','ERROR','SUCCESS')] [string]$Level,
    [string]$Message,
    [string]$Category = 'PREREQ'
  )
  $ts = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
  $line = "$ts  [$Level]  [$Category] $Message".TrimEnd()
  switch ($Level) {
    'ERROR'   { Write-Host $line -ForegroundColor Red    }
    'WARN'    { Write-Host $line -ForegroundColor Yellow }
    'SUCCESS' { Write-Host $line -ForegroundColor Green  }
    default   { Write-Host $line }
  }
}

function Get-Cmd([string]$name) { return Get-Command $name -ErrorAction SilentlyContinue }
function Get-ToolVersion([string]$exe, [string[]]$vArgs) {
  try { return (& $exe @vArgs 2>&1 | Select-Object -First 1) } catch { return $null }
}

# npm-installed CLIs (npm, npx, playwright, appium) ship as PowerShell .ps1 shims that reference
# $MyInvocation.Statement, which throws under Set-StrictMode. Run those through cmd.exe instead.
function Invoke-Cli([string]$commandLine) {
  try {
    $out = & cmd /c "$commandLine 2>&1"
    return [pscustomobject]@{ Ok = ($LASTEXITCODE -eq 0); Out = (($out | Out-String).Trim()) }
  } catch {
    return [pscustomobject]@{ Ok = $false; Out = $_.Exception.Message }
  }
}

# ---------------------------------------------------------------------------
# Load config
# ---------------------------------------------------------------------------
if (-not (Test-Path $ConfigPath)) { Write-Log ERROR "Config not found: $ConfigPath" 'FILE'; exit $EXIT_FILE }
try { $cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json }
catch { Write-Log ERROR "Config is not valid JSON: $($_.Exception.Message)" 'FILE'; exit $EXIT_FILE }

function SubEnabled($obj) {
  return ($null -ne $obj) -and ($obj.PSObject.Properties.Name -contains 'enabled') -and ([bool]$obj.enabled)
}

$ui  = if ($cfg.PSObject.Properties.Name -contains 'ui_exploration')     { $cfg.ui_exploration }     else { $null }
$mob = if ($cfg.PSObject.Properties.Name -contains 'mobile_exploration') { $cfg.mobile_exploration } else { $null }
$uiEnabled  = SubEnabled $ui
$mobEnabled = SubEnabled $mob

if (-not $uiEnabled -and -not $mobEnabled) {
  Write-Log INFO 'Neither ui_exploration nor mobile_exploration is enabled - no exploration prerequisites to check.'
  exit $EXIT_OK
}

$missing = [System.Collections.Generic.List[string]]::new()   # required-but-missing
$warn    = [System.Collections.Generic.List[string]]::new()   # optional-but-missing

# ---------------------------------------------------------------------------
# Web UI exploration - Node.js + npm + Playwright + browsers
# ---------------------------------------------------------------------------
if ($uiEnabled) {
  Write-Log INFO 'ui_exploration.enabled=true - checking Playwright tooling...'

  $node = Get-Cmd 'node'
  if ($node) { Write-Log SUCCESS ("Node.js OK - " + (Get-ToolVersion $node.Source @('--version'))) }
  else { $missing.Add("Node.js not found (needed for Playwright). Install from https://nodejs.org/ (LTS).") }

  $npm = Get-Cmd 'npm'
  if (-not $npm) { $missing.Add("npm not found - required to install Playwright. Install Node.js LTS (bundles npm).") }

  # Playwright CLI: prefer a global 'playwright', else 'npx playwright'.
  $pwCmd = Get-Cmd 'playwright'
  $pwVersion = $null
  if ($pwCmd) {
    $r = Invoke-Cli 'playwright --version'
    if ($r.Ok) { $pwVersion = $r.Out }
  } elseif ($npm) {
    $r = Invoke-Cli 'npx --yes playwright --version'
    if ($r.Ok) { $pwVersion = ($r.Out -split "`n" | Select-Object -Last 1).Trim() }
  }

  if ($pwVersion) {
    Write-Log SUCCESS ("Playwright OK - " + $pwVersion)
  } else {
    if ($InstallDeps -and $npm) {
      Write-Log INFO 'Playwright not found - installing globally (npm i -g playwright)...'
      $r = Invoke-Cli 'npm i -g playwright'
      if ($r.Ok) {
        Write-Log SUCCESS 'Playwright installed.'
        $pwCmd = Get-Cmd 'playwright'
        $rv = Invoke-Cli 'playwright --version'
        $pwVersion = if ($rv.Ok) { $rv.Out } else { 'installed' }
      } else {
        $missing.Add("Playwright install failed. Install manually: npm i -g playwright")
      }
    } else {
      $missing.Add("Playwright not found. Install with: npm i -g playwright")
    }
  }

  # Playwright browser binaries (Chromium is enough for exploration).
  if ($pwVersion -and $npm) {
    if ($InstallDeps) {
      Write-Log INFO 'Ensuring Playwright browser binaries are installed (playwright install chromium)...'
      $installCmd = if (Get-Cmd 'playwright') { 'playwright install chromium' } else { 'npx --yes playwright install chromium' }
      $r = Invoke-Cli $installCmd
      if ($r.Ok) { Write-Log SUCCESS 'Playwright Chromium browser is available.' }
      else { $warn.Add("Could not install Playwright browsers automatically. Run: playwright install") }
    } else {
      $warn.Add('Skipped Playwright browser install (-InstallDeps:$false). Run once: playwright install')
    }
  }
}

# ---------------------------------------------------------------------------
# Mobile-app exploration - Python + Appium client, and (local) Appium server/driver/SDK
# ---------------------------------------------------------------------------
if ($mobEnabled) {
  $mobPlatform = if (($mob.PSObject.Properties.Name -contains 'platform') -and $mob.platform) { "$($mob.platform)" } else { 'android' }
  $mobTarget   = if (($mob.PSObject.Properties.Name -contains 'execution_target') -and $mob.execution_target) { "$($mob.execution_target)" } else { 'local' }
  Write-Log INFO "mobile_exploration.enabled=true (platform=$mobPlatform, execution_target=$mobTarget) - checking Appium tooling..."

  # --- Python 3.9+ ---
  $python = (Get-Cmd 'python'); if (-not $python) { $python = Get-Cmd 'python3' }
  $pyOk = $false
  if (-not $python) {
    $missing.Add("Python 3.9+ not found (needed for Appium-Python-Client). Install from https://www.python.org/downloads/.")
  } else {
    $pyVerRaw = Get-ToolVersion $python.Source @('--version')
    if ($pyVerRaw -match '(\d+)\.(\d+)\.(\d+)') {
      $maj = [int]$Matches[1]; $min = [int]$Matches[2]
      if ($maj -gt 3 -or ($maj -eq 3 -and $min -ge 9)) { $pyOk = $true; Write-Log SUCCESS ("Python OK - " + $pyVerRaw + " (" + $python.Source + ")") }
      else { $missing.Add("Python $maj.$min found but 3.9+ is required. Upgrade Python.") }
    } else {
      $warn.Add("Could not determine Python version from '$pyVerRaw'. Ensure Python 3.9+ is installed.")
    }
  }

  # --- Python packages: Appium-Python-Client (+ selenium) and, for BrowserStack, requests ---
  # pip distribution name -> import module name.
  $pyPkgs = [ordered]@{ 'Appium-Python-Client' = 'appium'; 'selenium' = 'selenium' }
  if ($mobTarget -eq 'browserstack') { $pyPkgs['requests'] = 'requests' }
  $missingPyPkgs = [System.Collections.Generic.List[string]]::new()
  if ($pyOk) {
    foreach ($pkg in $pyPkgs.GetEnumerator()) {
      $probe = & $python.Source -c "import importlib; m=importlib.import_module('$($pkg.Value)'); print(getattr(m,'__version__',''))" 2>$null
      if ($LASTEXITCODE -eq 0) {
        $ver = if ([string]::IsNullOrWhiteSpace($probe)) { 'installed' } else { "v$probe" }
        Write-Log SUCCESS "Python package OK - $($pkg.Key) ($ver)"
      } else {
        $missingPyPkgs.Add($pkg.Key); Write-Log WARN "Python package MISSING - $($pkg.Key)"
      }
    }
    if ($InstallDeps -and $missingPyPkgs.Count -gt 0) {
      Write-Log INFO "Installing missing Python packages: $($missingPyPkgs -join ', ')"
      try { & $python.Source -m pip install --upgrade @($missingPyPkgs); Write-Log SUCCESS "Python packages installed."; $missingPyPkgs.Clear() }
      catch { Write-Log WARN "pip install failed: $($_.Exception.Message). Install manually: $($python.Source) -m pip install $($missingPyPkgs -join ' ')" }
    }
    foreach ($p in $missingPyPkgs) { $missing.Add("Python package '$p' missing. Install with: $($python.Source) -m pip install $p") }
  }

  # --- Local-only: Node.js + npm + Appium CLI + platform driver + SDK tooling ---
  if ($mobTarget -eq 'local') {
    $node = Get-Cmd 'node'
    if ($node) { Write-Log SUCCESS ("Node.js OK - " + (Get-ToolVersion $node.Source @('--version'))) }
    else { $missing.Add("Node.js not found (needed for the local Appium server). Install from https://nodejs.org/ (LTS).") }

    $npm = Get-Cmd 'npm'
    if (-not $npm) { $missing.Add("npm not found - required to install Appium and its drivers.") }

    $appium = Get-Cmd 'appium'
    if (-not $appium -and $InstallDeps -and $npm) {
      Write-Log INFO 'Appium not found - installing globally (npm i -g appium)...'
      $r = Invoke-Cli 'npm i -g appium'
      if ($r.Ok) { Write-Log SUCCESS 'Appium installed.'; $appium = Get-Cmd 'appium' }
      else { $missing.Add("Appium install failed. Install manually: npm i -g appium") }
    }
    if ($appium) {
      $av = Invoke-Cli 'appium --version'
      Write-Log SUCCESS ("Appium CLI OK - v" + $av.Out)
      $requiredDriver = if ($mobPlatform -eq 'ios') { 'xcuitest' } else { 'uiautomator2' }
      $driverList = (Invoke-Cli 'appium driver list --installed').Out
      if ($driverList -match [regex]::Escape($requiredDriver)) {
        Write-Log SUCCESS "Appium driver OK - $requiredDriver installed"
      } elseif ($InstallDeps) {
        Write-Log INFO "Installing Appium '$requiredDriver' driver..."
        $r = Invoke-Cli "appium driver install $requiredDriver"
        if ($r.Ok) { Write-Log SUCCESS "Appium '$requiredDriver' driver installed." }
        else { $missing.Add("Appium '$requiredDriver' driver not installed. Install with: appium driver install $requiredDriver") }
      } else {
        $missing.Add("Appium '$requiredDriver' driver not installed. Install with: appium driver install $requiredDriver")
      }
    } elseif (-not $appium) {
      $missing.Add("Appium server not found (local target). Install with: npm i -g appium")
    }

    if ($mobPlatform -eq 'android') {
      if (Get-Cmd 'adb') { Write-Log SUCCESS ("Android adb OK - " + (Get-ToolVersion (Get-Cmd 'adb').Source @('version'))) }
      else { $missing.Add("adb not found (Android). Install Android Studio + SDK platform-tools and add them to PATH.") }
    } elseif ($mobPlatform -eq 'ios') {
      if (Get-Cmd 'xcrun') { Write-Log SUCCESS 'Xcode command-line tools OK (xcrun found).' }
      else { $warn.Add("xcrun not found (iOS). Install Xcode + Command Line Tools (macOS only).") }
    }
  } else {
    Write-Log INFO "execution_target=browserstack - skipping local Appium server / driver / adb / Xcode checks (device runs in the cloud)."
  }
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
foreach ($w in $warn) { Write-Log WARN $w }

if ($missing.Count -gt 0) {
  Write-Log WARN "$($missing.Count) exploration prerequisite(s) still missing:"
  for ($i = 0; $i -lt $missing.Count; $i++) { Write-Log WARN "  [$($i + 1)] $($missing[$i])" }
  if ($StrictPrereqs) {
    Write-Log ERROR "Aborting - required exploration prerequisites are missing (-StrictPrereqs)." 'PREREQ'
    exit $EXIT_PREREQ
  }
  Write-Log WARN "Continuing - the exploration pass will record any tool it cannot use as an unresolved artifact."
  exit $EXIT_OK
}

Write-Log SUCCESS 'All exploration prerequisites satisfied.'
exit $EXIT_OK
