# lint-robot-pom.ps1 — Deterministic POM structure lint for generated Robot Framework + Appium tests.
#
# Offloads the "no raw locators / keyword-driven structure" Quality Gate from the LLM.
# Scans the test output tree and flags structural violations:
#   - tests/*.robot suites that contain raw locator strings or raw AppiumLibrary
#     keywords directly (must call page-object keywords only)
#   - resources/keywords (page object) files that contain *** Test Cases *** sections
#     (test cases belong in tests/)
#   - resources/locators files that contain AppiumLibrary keyword calls
#     (locator files hold variables only)
#   - test suite files not named <kebab>.robot
#
# Usage: lint-robot-pom.ps1 -TestDir "mobile-tests"
# Exit codes: 0 = clean, 2 = violations, 1 = path error.

param(
  [Parameter(Mandatory = $true)][string]$TestDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $TestDir)) { Write-Host "[ERROR] Test dir not found: $TestDir" -ForegroundColor Red; exit 1 }

$violations = [System.Collections.Generic.List[string]]::new()

$testsDir     = Join-Path $TestDir 'tests'
$keywordsDir  = Join-Path $TestDir 'resources/keywords'
$locatorsDir  = Join-Path $TestDir 'resources/locators'

# Raw AppiumLibrary interaction keywords that must not appear directly in test suites.
# Test suites must only call page-object (business) keywords, never AppiumLibrary keywords
# or raw locator strategies.
$rawInteractionPatterns = @(
  'Click\s+Element', 'Click\s+Button', 'Input\s+Text', 'Input\s+Password',
  'Tap\b', 'Long\s+Press', 'Swipe\b', 'Scroll\b',
  'Wait\s+Until\s+Element', 'Wait\s+Until\s+Page\s+Contains\s+Element',
  'Element\s+Should\s+Be\s+Visible', 'Element\s+Text\s+Should\s+Be',
  'Element\s+Attribute\s+Should\s+Match', 'Page\s+Should\s+Contain\s+Element',
  'Get\s+Text', 'Get\s+Element\s+Attribute'
)
# Raw locator strategy strings that must not appear in test suites.
$rawLocatorPatterns = @(
  'accessibility_id\s*=', 'xpath\s*=', '-android\s+uiautomator', '-ios\s+predicate\s+string',
  '-ios\s+class\s+chain', 'class\s*=\s*android\.', 'class\s*=\s*XCUIElementType', 'id\s*=\s*com\.'
)
$kebab = '^[a-z0-9]+(-[a-z0-9]+)*\.robot$'

if (Test-Path $testsDir) {
  Get-ChildItem $testsDir -Filter '*.robot' -File -Recurse | ForEach-Object {
    $file = $_
    if ($file.Name -notmatch $kebab) { $violations.Add("$($file.Name): test suite file name is not kebab-case '<name>.robot'.") }
    $lineNo = 0
    foreach ($line in (Get-Content $file.FullName)) {
      $lineNo++
      # Skip comment lines and settings/documentation lines.
      if ($line -match '^\s*#') { continue }
      foreach ($pat in ($rawInteractionPatterns + $rawLocatorPatterns)) {
        if ($line -match $pat) { $violations.Add("$($file.Name):$lineNo raw locator/AppiumLibrary interaction '$($Matches[0])' - test suites must call page-object keywords only."); break }
      }
    }
  }
} else {
  Write-Host "[WARN] No tests/ folder under $TestDir." -ForegroundColor Yellow
}

if (Test-Path $keywordsDir) {
  Get-ChildItem $keywordsDir -Filter '*.resource' -File -Recurse | ForEach-Object {
    $file = $_
    $lineNo = 0
    foreach ($line in (Get-Content $file.FullName)) {
      $lineNo++
      if ($line -match '^\s*#') { continue }
      if ($line -match '\*\*\*\s*Test\s+Cases\s*\*\*\*') {
        $violations.Add("$($file.Name):$lineNo '*** Test Cases ***' section found in a page-object resource - test cases belong in tests/.")
      }
    }
  }
}

if (Test-Path $locatorsDir) {
  Get-ChildItem $locatorsDir -Filter '*.resource' -File -Recurse | ForEach-Object {
    $file = $_
    $lineNo = 0
    foreach ($line in (Get-Content $file.FullName)) {
      $lineNo++
      if ($line -match '^\s*#') { continue }
      if ($line -match '\*\*\*\s*Keywords\s*\*\*\*') {
        $violations.Add("$($file.Name):$lineNo '*** Keywords ***' section found in a locator resource - locator files hold '*** Variables ***' only.")
      }
    }
  }
}

if ($violations.Count -gt 0) {
  Write-Host "[INVALID] $($violations.Count) POM structure violation(s):" -ForegroundColor Red
  $violations | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 2
}

Write-Host "[OK] POM structure clean under $TestDir (no raw locators in suites; no test cases in keyword files; no keywords in locator files)." -ForegroundColor Green
exit 0
