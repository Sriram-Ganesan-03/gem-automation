# lint-playwright-pom.ps1 — Deterministic POM structure lint for generated Playwright tests.
#
# Offloads the "no raw selectors / POM structure" Quality Gate from the LLM.
# Scans the test output tree and flags structural violations:
#   - specs/ files that contain raw selectors or raw page.* interactions (must call page objects only)
#   - pages/ files that contain test()/test.describe() (tests belong in specs)
#   - spec files not named <kebab>.spec.ts
#
# Usage: lint-playwright-pom.ps1 -TestDir "tests/e2e"
# Exit codes: 0 = clean, 2 = violations, 1 = path error.

param(
  [Parameter(Mandatory = $true)][string]$TestDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $TestDir)) { Write-Host "[ERROR] Test dir not found: $TestDir" -ForegroundColor Red; exit 1 }

$violations = [System.Collections.Generic.List[string]]::new()

$specsDir = Join-Path $TestDir 'specs'
$pagesDir = Join-Path $TestDir 'pages'

# Raw-selector / raw-interaction patterns that must not appear in specs.
$rawSelectorPatterns = @(
  '\.locator\(', 'page\.\$\(', 'page\.\$\$\(',
  'getByRole\(', 'getByTestId\(', 'getByText\(', 'getByLabel\(', 'getByPlaceholder\(', 'getByAltText\(', 'getByTitle\(',
  'page\.(click|fill|type|check|uncheck|selectOption|press|hover|dblclick|setInputFiles|dragAndDrop)\('
)
$kebab = '^[a-z0-9]+(-[a-z0-9]+)*\.spec\.ts$'

if (Test-Path $specsDir) {
  Get-ChildItem $specsDir -Filter '*.spec.ts' -File -Recurse | ForEach-Object {
    $file = $_
    if ($file.Name -notmatch $kebab) { $violations.Add("$($file.Name): spec file name is not kebab-case '<name>.spec.ts'.") }
    $lineNo = 0
    foreach ($line in (Get-Content $file.FullName)) {
      $lineNo++
      # Skip import lines and comments.
      if ($line -match '^\s*(//|\*|/\*|import\s)') { continue }
      foreach ($pat in $rawSelectorPatterns) {
        if ($line -match $pat) { $violations.Add("$($file.Name):$lineNo raw selector/interaction '$($Matches[0])' - specs must call page-object methods only."); break }
      }
    }
  }
} else {
  Write-Host "[WARN] No specs/ folder under $TestDir." -ForegroundColor Yellow
}

if (Test-Path $pagesDir) {
  Get-ChildItem $pagesDir -Filter '*.ts' -File -Recurse | ForEach-Object {
    $file = $_
    $lineNo = 0
    foreach ($line in (Get-Content $file.FullName)) {
      $lineNo++
      if ($line -match '^\s*(//|\*|/\*)') { continue }
      if ($line -match '\btest\s*\(' -or $line -match '\btest\.describe\s*\(') {
        $violations.Add("$($file.Name):$lineNo test()/test.describe() found in a page object - tests belong in specs/.")
      }
    }
  }
}

if ($violations.Count -gt 0) {
  Write-Host "[INVALID] $($violations.Count) POM structure violation(s):" -ForegroundColor Red
  $violations | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 2
}

Write-Host "[OK] POM structure clean under $TestDir (no raw selectors in specs; no tests in pages)." -ForegroundColor Green
exit 0
