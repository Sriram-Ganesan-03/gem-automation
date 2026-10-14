# validate-postman-payload.ps1 — Deterministic structural validation of a Postman collection payload.
#
# Offloads the "collection structure conforms" self-check from the LLM. Validates the
# payload that apply-postman-payload.ps1 will PUT ({ collectionId, collection }) OR a bare
# Postman v2.1 collection JSON: schema version, item tree, and per-request required fields.
# Semantic checks (auth/variable conventions, test coverage) remain with the LLM.
#
# Usage: validate-postman-payload.ps1 -PayloadPath ../artifacts/collection-payload.json
# Exit codes: 0 = valid, 2 = violations, 1 = file/parse error.

param(
  [Parameter(Mandatory = $true)][string]$PayloadPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $PayloadPath)) { Write-Host "[ERROR] Payload not found: $PayloadPath" -ForegroundColor Red; exit 1 }
try { $doc = Get-Content $PayloadPath -Raw | ConvertFrom-Json } catch { Write-Host "[ERROR] Not valid JSON: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }

# Accept either { collectionId, collection } or a bare collection object.
$collection = if ($doc.PSObject.Properties.Name -contains 'collection') { $doc.collection } else { $doc }
if ($doc.PSObject.Properties.Name -contains 'collection' -and -not ($doc.PSObject.Properties.Name -contains 'collectionId')) {
  Write-Host "[WARN] Payload has 'collection' but no 'collectionId' - apply-postman-payload.ps1 requires both to PUT." -ForegroundColor Yellow
}

$violations = [System.Collections.Generic.List[string]]::new()

if (-not ($collection.PSObject.Properties.Name -contains 'info')) { $violations.Add("collection.info is missing.") }
elseif (-not ($collection.info.PSObject.Properties.Name -contains 'schema') -or "$($collection.info.schema)" -notmatch 'v2\.1\.0') {
  $violations.Add("collection.info.schema must be the Postman v2.1.0 schema (got '$($collection.info.schema)').")
}
if (-not ($collection.PSObject.Properties.Name -contains 'item') -or -not $collection.item) {
  $violations.Add("collection.item[] is missing or empty.")
}

$requestCount = 0
function Walk-Items($items, [string]$path) {
  foreach ($it in $items) {
    $name = if ($it.PSObject.Properties.Name -contains 'name') { "$($it.name)" } else { '(unnamed)' }
    $here = if ($path) { "$path / $name" } else { $name }
    $isFolder = ($it.PSObject.Properties.Name -contains 'item') -and $it.item
    if ($isFolder) { Walk-Items $it.item $here; continue }
    # It's a request item.
    $script:requestCount++
    if ([string]::IsNullOrWhiteSpace($name) -or $name -eq '(unnamed)') { $script:violations.Add("Request under '$path' has no name.") }
    if (-not ($it.PSObject.Properties.Name -contains 'request')) { $script:violations.Add("'$here': missing request block."); continue }
    $req = $it.request
    if (-not ($req.PSObject.Properties.Name -contains 'method') -or [string]::IsNullOrWhiteSpace("$($req.method)")) { $script:violations.Add("'$here': request.method is missing.") }
    $hasUrl = ($req.PSObject.Properties.Name -contains 'url') -and ($null -ne $req.url) -and ("$($req.url | ConvertTo-Json -Compress)".Length -gt 2)
    if (-not $hasUrl) { $script:violations.Add("'$here': request.url is missing.") }
  }
}

if ($collection.PSObject.Properties.Name -contains 'item' -and $collection.item) {
  Walk-Items $collection.item ''
}

if ($requestCount -eq 0 -and $violations.Count -eq 0) { $violations.Add("No request items found in the collection.") }

if ($violations.Count -gt 0) {
  Write-Host "[INVALID] $($violations.Count) structural violation(s) ($requestCount request(s) scanned):" -ForegroundColor Red
  $violations | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 2
}

Write-Host "[OK] Postman payload structurally valid: $requestCount request(s), v2.1 schema." -ForegroundColor Green
exit 0
