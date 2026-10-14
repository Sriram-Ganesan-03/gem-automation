param(
  [Parameter(Mandatory = $true)]
  [string]$Operation,
  [string]$GuardrailsPath = "$PSScriptRoot/../config/ado-operation-guardrails.json",
  [string]$RunMode        = 'dry-run'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Exit codes
# ---------------------------------------------------------------------------
$EXIT_ALLOWED     = 0   # Operation permitted
$EXIT_FILE        = 1   # Guardrails file not found or unreadable
$EXIT_BLOCKED     = 2   # Operation is in the blocked list (security violation)
$EXIT_FAIL_CLOSED = 3   # Operation not in any allowed list; fail-closed policy

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

# ---------------------------------------------------------------------------
# PHASE 1 — File access (fail-fast)
# ---------------------------------------------------------------------------
try {
  if (-not (Test-Path $GuardrailsPath)) {
    throw "ADO guardrails file not found: $GuardrailsPath"
  }
}
catch {
  Write-Log ERROR $_.Exception.Message 'FILE'
  Write-Log ERROR "Cannot gate operation '$Operation' — guardrails file is missing. Failing closed." 'ADO-GATE'
  exit $EXIT_FILE
}

# ---------------------------------------------------------------------------
# PHASE 2 — JSON parsing (fail-fast)
# ---------------------------------------------------------------------------
try {
  $guard = Get-Content $GuardrailsPath -Raw | ConvertFrom-Json
  if (-not $guard) { throw 'ADO guardrails file parsed to an empty object.' }
}
catch {
  Write-Log ERROR "Failed to parse ADO guardrails JSON: $($_.Exception.Message)" 'PARSE'
  Write-Log ERROR "Cannot gate operation '$Operation' — guardrails file is unreadable. Failing closed." 'ADO-GATE'
  exit $EXIT_FILE
}

# ---------------------------------------------------------------------------
# PHASE 3 — Gate the operation
# ---------------------------------------------------------------------------
$blocked      = @($guard.blockedWriteOperations)
$allowedRead  = @($guard.allowedReadOperations)
$allowedWrite = @($guard.allowedWriteOperationsInExecuteMode)
$failClosed   = [bool]$guard.failClosed

Write-Log INFO "Gating ADO operation: '$Operation'  run_mode=$RunMode" 'ADO-GATE'

# Blocked list is checked first — no run_mode exception
if ($blocked -contains $Operation) {
  Write-Log ERROR "BLOCKED — '$Operation' is in blockedWriteOperations. This operation is never permitted." 'ADO-GATE'
  exit $EXIT_BLOCKED
}

# Allowed read operations
if ($allowedRead -contains $Operation) {
  Write-Log SUCCESS "ALLOWED (read) — '$Operation'" 'ADO-GATE'
  exit $EXIT_ALLOWED
}

# Allowed write operations in execute mode only
if ($RunMode -eq 'execute' -and $allowedWrite -contains $Operation) {
  Write-Log SUCCESS "ALLOWED (execute-mode write) — '$Operation'" 'ADO-GATE'
  exit $EXIT_ALLOWED
}

if ($RunMode -ne 'execute' -and $allowedWrite -contains $Operation) {
  Write-Log ERROR "DENIED — '$Operation' is an execute-mode write operation but run_mode is '$RunMode'. Switch to execute mode to permit this call." 'ADO-GATE'
  exit $EXIT_FAIL_CLOSED
}

# Fail-closed: anything not explicitly allowed is denied
if ($failClosed) {
  Write-Log ERROR "DENIED (fail-closed) — '$Operation' is not in any allowed list. Add it to allowedReadOperations or allowedWriteOperationsInExecuteMode to permit it." 'ADO-GATE'
  exit $EXIT_FAIL_CLOSED
}

# Fail-open fallback (failClosed = false in guardrails — unusual, warn loudly)
Write-Log WARN "ALLOWED (open policy) — '$Operation' is not in any list but failClosed=false. Consider adding it to an explicit allow list." 'ADO-GATE'
exit $EXIT_ALLOWED

