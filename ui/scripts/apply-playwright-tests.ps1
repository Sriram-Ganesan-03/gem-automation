param(
  [string]$ArtifactsPath = "$PSScriptRoot/../artifacts/tests",
  [string]$TargetPath    = $null,
  [string]$ConfigPath    = "$PSScriptRoot/../config/workflow-input.current.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Exit codes
# ---------------------------------------------------------------------------
$EXIT_OK        = 0   # All files processed successfully
$EXIT_NOT_FOUND = 1   # Artifacts path missing or no POM files found
$EXIT_PARTIAL   = 2   # At least one file failed to copy (others may have succeeded)
$EXIT_FATAL     = 3   # Unexpected error before any processing began

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
    'ERROR'   { Write-Host $line -ForegroundColor Red    }
    'WARN'    { Write-Host $line -ForegroundColor Yellow }
    'SUCCESS' { Write-Host $line -ForegroundColor Green  }
    default   { Write-Host $line                         }
  }
}

$runStartTime  = Get-Date
$copySucceeded = [System.Collections.Generic.List[string]]::new()
$copyFailed    = [System.Collections.Generic.List[string]]::new()

# ---------------------------------------------------------------------------
# PHASE 1 — Source path validation (fail-fast)
# ---------------------------------------------------------------------------
Write-Log INFO "Starting apply-playwright-tests." 'APPLY'
Write-Log INFO "Artifacts source: $ArtifactsPath" 'APPLY'

try {
  if (-not (Test-Path $ArtifactsPath)) {
    throw "Artifacts path not found: $ArtifactsPath"
  }
}
catch {
  Write-Log ERROR $_.Exception.Message 'PATH'
  Write-Log ERROR 'Run build-tests-from-ado first to generate artifacts.' 'APPLY'
  exit $EXIT_NOT_FOUND
}

# ---------------------------------------------------------------------------
# PHASE 2 — Discover POM files (all three layers)
# ---------------------------------------------------------------------------
try {
  # Collect the full POM tree: locators/, pages/, specs/
  $pomFiles = Get-ChildItem -Path $ArtifactsPath -Recurse -File |
              Where-Object { $_.Extension -in @('.ts') }

  if ($pomFiles.Count -eq 0) {
    Write-Log WARN "No TypeScript files found under: $ArtifactsPath" 'DISCOVER'
    Write-Log WARN 'Nothing to copy — artifacts may not have been generated yet.' 'DISCOVER'
    exit $EXIT_NOT_FOUND
  }

  Write-Log INFO "Discovered $($pomFiles.Count) POM file(s):" 'DISCOVER'
  foreach ($f in $pomFiles) {
    $rel = $f.FullName.Replace($ArtifactsPath, '').TrimStart('\','/')
    Write-Log INFO "  $rel" 'DISCOVER'
  }
}
catch {
  Write-Log ERROR "Failed to scan artifacts directory: $($_.Exception.Message)" 'DISCOVER'
  exit $EXIT_FATAL
}

# ---------------------------------------------------------------------------
# PHASE 3 — Copy to target (verify-only when TargetPath not supplied)
# ---------------------------------------------------------------------------
if (-not $TargetPath -and (Test-Path $ConfigPath)) {
  try {
    $cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
    # Resolve the project root. The .github folder always lives inside the target
    # project, so the project root is auto-derived as the parent of .github
    # (three levels up from this script: .github/ui/scripts -> project root).
    # target_local_path is only an optional override.
    $projectRoot = if ($cfg.PSObject.Properties.Name -contains 'target_local_path' -and $cfg.target_local_path) {
      $cfg.target_local_path
    } else {
      (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
    }
    $testOutput = if ($cfg.test_output_path) { $cfg.test_output_path } else { 'tests' }
    $TargetPath = Join-Path $projectRoot $testOutput
    Write-Log INFO "Derived TargetPath from project root '$projectRoot': $TargetPath" 'CONFIG'
  }
  catch {
    Write-Log WARN "Could not derive TargetPath from '$ConfigPath': $($_.Exception.Message)" 'CONFIG'
  }
}

if (-not $TargetPath) {
  Write-Log WARN 'TargetPath not provided — verification only, no files copied.' 'COPY'
  $elapsed = [math]::Round(((Get-Date) - $runStartTime).TotalSeconds, 2)
  Write-Log SUCCESS "apply-playwright-tests complete (verify-only). ($elapsed`s)" 'APPLY'
  exit $EXIT_OK
}

Write-Log INFO "Target path: $TargetPath" 'COPY'

# Create target root if absent
try {
  if (-not (Test-Path $TargetPath)) {
    New-Item -ItemType Directory -Force -Path $TargetPath | Out-Null
    Write-Log INFO "Created target directory: $TargetPath" 'COPY'
  }
}
catch {
  Write-Log ERROR "Failed to create target directory '$TargetPath': $($_.Exception.Message)" 'COPY'
  exit $EXIT_FATAL
}

# Copy each file — preserve sub-folder structure (locators/, pages/, specs/)
foreach ($file in $pomFiles) {
  try {
    $relPath = $file.FullName.Substring($ArtifactsPath.Length).TrimStart('\','/')
    $destFile = Join-Path $TargetPath $relPath
    $destDir  = Split-Path $destFile -Parent

    if (-not (Test-Path $destDir)) {
      New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }

    Copy-Item -Path $file.FullName -Destination $destFile -Force
    Write-Log INFO "Copied  $relPath" 'COPY'
    $copySucceeded.Add($relPath)
  }
  catch {
    Write-Log ERROR "Failed to copy '$($file.Name)': $($_.Exception.Message)" 'COPY'
    $copyFailed.Add($file.FullName)
  }
}

# ---------------------------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------------------------
$elapsed = [math]::Round(((Get-Date) - $runStartTime).TotalSeconds, 2)

Write-Log INFO "--- Copy Summary ---" 'APPLY'
Write-Log INFO "  Succeeded : $($copySucceeded.Count)" 'APPLY'

if ($copyFailed.Count -gt 0) {
  Write-Log ERROR "  Failed    : $($copyFailed.Count)" 'APPLY'
  Write-Log ERROR "Failed files:" 'APPLY'
  foreach ($f in $copyFailed) { Write-Log ERROR "  $f" 'APPLY' }
  Write-Log ERROR "apply-playwright-tests completed with errors. ($elapsed`s)" 'APPLY'
  exit $EXIT_PARTIAL
}

Write-Log SUCCESS "apply-playwright-tests complete — $($copySucceeded.Count) file(s) copied to $TargetPath. ($elapsed`s)" 'APPLY'
exit $EXIT_OK

