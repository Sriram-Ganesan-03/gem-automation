# parse-ado-refs.ps1 — Deterministically extract ADO identifiers from URLs / config.
#
# Offloads URL parsing from the LLM. Emits a compact JSON object on stdout with
# any of: org, project, work_item_id, plan_id, suite_id. Missing parts are null.
#
# Usage:
#   parse-ado-refs.ps1 -WorkItemUrl "https://dev.azure.com/everi/Loyalty%20Kiosk/_workitems/edit/1338351"
#   parse-ado-refs.ps1 -TestPlanUrl "https://dev.azure.com/everi/Proj/_testPlans/execute?planId=432931&suiteId=1329228"
#   parse-ado-refs.ps1 -ConfigPath ../config/workflow-input.current.json
#
# Exit codes: 0 = at least one id resolved, 2 = nothing resolved, 1 = bad input.

param(
  [string]$WorkItemUrl,
  [string]$TestPlanUrl,
  [string]$ConfigPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$result = [ordered]@{ org = $null; project = $null; work_item_id = $null; plan_id = $null; suite_id = $null }

function Decode([string]$s) { if ($null -eq $s) { return $null } return [System.Uri]::UnescapeDataString($s) }

if ($ConfigPath) {
  if (-not (Test-Path $ConfigPath)) { Write-Host "[ERROR] Config not found: $ConfigPath" -ForegroundColor Red; exit 1 }
  $cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
  if ($cfg.PSObject.Properties.Name -contains 'user_story_ado_link' -and $cfg.user_story_ado_link) { $WorkItemUrl = $cfg.user_story_ado_link }
  if ($cfg.PSObject.Properties.Name -contains 'test_cases_ado_link' -and $cfg.test_cases_ado_link) { $TestPlanUrl = $cfg.test_cases_ado_link }
  if ($cfg.PSObject.Properties.Name -contains 'user_story_id'  -and $cfg.user_story_id)  { $result.work_item_id = [int]$cfg.user_story_id }
  if ($cfg.PSObject.Properties.Name -contains 'ado_org_url'    -and $cfg.ado_org_url)    { if ($cfg.ado_org_url -match 'dev\.azure\.com/([^/]+)') { $result.org = Decode $Matches[1] } }
  if ($cfg.PSObject.Properties.Name -contains 'ado_project'    -and $cfg.ado_project)    { $result.project = $cfg.ado_project }
}

# Work item URL: .../{org}/{project}/_workitems/edit/{id}
if ($WorkItemUrl) {
  if ($WorkItemUrl -match 'dev\.azure\.com/([^/]+)/([^/]+)/_workitems') { $result.org = Decode $Matches[1]; $result.project = Decode $Matches[2] }
  if ($WorkItemUrl -match '_workitems/edit/(\d+)') { $result.work_item_id = [int]$Matches[1] }
  elseif ($WorkItemUrl -match '/(\d+)(?:[/?#]|$)') { $result.work_item_id = [int]$Matches[1] }
}

# Test plan URL: .../{org}/{project}/_testPlans/...?planId=..&suiteId=..
if ($TestPlanUrl) {
  if ($TestPlanUrl -match 'dev\.azure\.com/([^/]+)/([^/]+)/_testPlans') { if (-not $result.org) { $result.org = Decode $Matches[1] }; if (-not $result.project) { $result.project = Decode $Matches[2] } }
  if ($TestPlanUrl -match '[?&]planId=(\d+)')  { $result.plan_id  = [int]$Matches[1] }
  if ($TestPlanUrl -match '[?&]suiteId=(\d+)') { $result.suite_id = [int]$Matches[1] }
}

$resolved = ($result.Values | Where-Object { $null -ne $_ }).Count
$result | ConvertTo-Json -Compress
if ($resolved -eq 0) { exit 2 } else { exit 0 }
