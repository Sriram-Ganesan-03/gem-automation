param(
  [Parameter(Mandatory = $true)]
  [string]$Operation,
  [string]$GuardrailsPath = "config/ado-operation-guardrails.json"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $GuardrailsPath)) {
  throw "ADO guardrails file not found: $GuardrailsPath"
}

$guard = Get-Content $GuardrailsPath | ConvertFrom-Json
if (-not $guard) {
  throw 'ADO guardrails file could not be parsed.'
}

$blocked = @($guard.blockedWriteOperations)
$allowed = @($guard.allowedReadOperations)
$failClosed = [bool]$guard.failClosed

if ($blocked -contains $Operation) {
  throw "Blocked ADO operation: $Operation"
}

if ($allowed -contains $Operation) {
  Write-Host "ADO operation allowed: $Operation"
  exit 0
}

if ($failClosed) {
  throw "ADO operation not explicitly allowed (fail-closed): $Operation"
}

Write-Host "ADO operation allowed by open policy: $Operation"
