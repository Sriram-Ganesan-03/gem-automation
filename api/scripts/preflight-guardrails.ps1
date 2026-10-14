param(
  [string]$ConfigPath = "config/workflow-input.current.json",
  [string]$AdoGuardrailsPath = "config/ado-operation-guardrails.json"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ConfigPath)) {
  throw "Config file not found: $ConfigPath"
}

if (-not (Test-Path $AdoGuardrailsPath)) {
  throw "ADO guardrails file not found: $AdoGuardrailsPath"
}

$cfg = Get-Content $ConfigPath | ConvertFrom-Json
$adoGuard = Get-Content $AdoGuardrailsPath | ConvertFrom-Json

if (-not $adoGuard.failClosed) {
  throw 'Guard rail violation: ADO guardrails must be fail-closed.'
}

if ($adoGuard.mode -ne 'read-only') {
  throw 'Guard rail violation: ADO guardrails mode must be read-only.'
}

if (-not $adoGuard.blockedWriteOperations -or $adoGuard.blockedWriteOperations.Count -lt 1) {
  throw 'Guard rail violation: blockedWriteOperations must be defined.'
}

if (-not $adoGuard.allowedReadOperations -or $adoGuard.allowedReadOperations.Count -lt 1) {
  throw 'Guard rail violation: allowedReadOperations must be defined.'
}

$required = @(
  'reviewer_postman_user_id',
  'workspace_name',
  'target_workspace_type',
  'collection_id_or_url',
  'environment_id_or_url',
  'user_story_ado_link',
  'test_cases_ado_link',
  'run_mode',
  'allow_ado_mutation',
  'allow_probe_resources',
  'ado_access_mode',
  'environment_strategy',
  'allow_environment_creation',
  'ado_tool_calls_mode',
  'ado_write_tools_disabled'
)

foreach ($field in $required) {
  if (-not ($cfg.PSObject.Properties.Name -contains $field)) {
    throw "Missing required config field: $field"
  }
}

if ([string]::IsNullOrWhiteSpace($cfg.reviewer_postman_user_id)) { throw 'reviewer_postman_user_id must not be empty.' }
if ([string]::IsNullOrWhiteSpace($cfg.workspace_name)) { throw 'workspace_name must not be empty.' }
if ([string]::IsNullOrWhiteSpace($cfg.target_workspace_type)) { throw 'target_workspace_type must not be empty.' }
if ([string]::IsNullOrWhiteSpace($cfg.collection_id_or_url)) { throw 'collection_id_or_url must not be empty.' }
if ([string]::IsNullOrWhiteSpace($cfg.environment_id_or_url)) { throw 'environment_id_or_url must not be empty.' }
if ([string]::IsNullOrWhiteSpace($cfg.user_story_ado_link)) { throw 'user_story_ado_link must not be empty.' }
if ([string]::IsNullOrWhiteSpace($cfg.test_cases_ado_link)) { throw 'test_cases_ado_link must not be empty.' }

if ($cfg.allow_ado_mutation -ne $false) {
  throw 'Guard rail violation: allow_ado_mutation must be false.'
}

if ($cfg.allow_probe_resources -ne $false) {
  throw 'Guard rail violation: allow_probe_resources must be false.'
}

if ($cfg.ado_access_mode -ne 'read-only') {
  throw 'Guard rail violation: ado_access_mode must be read-only.'
}

if ($cfg.target_workspace_type -ne 'team') {
  throw 'Guard rail violation: target_workspace_type must be team.'
}

if ($cfg.environment_strategy -ne 'use-input-existing') {
  throw 'Guard rail violation: environment_strategy must be use-input-existing.'
}

if ($cfg.allow_environment_creation -ne $false) {
  throw 'Guard rail violation: allow_environment_creation must be false.'
}

if ($cfg.ado_tool_calls_mode -ne 'read-wrapper-only') {
  throw 'Guard rail violation: ado_tool_calls_mode must be read-wrapper-only.'
}

if ($cfg.ado_write_tools_disabled -ne $true) {
  throw 'Guard rail violation: ado_write_tools_disabled must be true.'
}

if ($cfg.run_mode -ne 'dry-run' -and $cfg.run_mode -ne 'execute') {
  throw "run_mode must be either dry-run or execute. Found: $($cfg.run_mode)"
}

if ($cfg.run_mode -eq 'execute') {
  if (-not ($cfg.PSObject.Properties.Name -contains 'execution_confirmation')) {
    throw 'execution_confirmation is required for execute mode.'
  }
  if ($cfg.execution_confirmation -ne 'APPROVED_EXECUTE') {
    throw 'Guard rail violation: execute mode requires execution_confirmation=APPROVED_EXECUTE.'
  }
}

if (-not $env:POSTMAN_API_KEY) { throw 'POSTMAN_API_KEY is missing in terminal environment.' }
if (-not $env:ADO_PAT) { throw 'ADO_PAT is missing in terminal environment.' }
if (-not $env:ADO_ORG) { throw 'ADO_ORG is missing in terminal environment.' }
if (-not $env:ADO_PROJECT) { throw 'ADO_PROJECT is missing in terminal environment.' }

Write-Host 'Preflight guard rails passed.'
Write-Host "Run mode: $($cfg.run_mode)"
