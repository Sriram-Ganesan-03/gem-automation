$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# ── Hard gate: fail before any API calls if guard rails are not satisfied ──────
& "$PSScriptRoot/scripts/preflight-guardrails.ps1" -ConfigPath "$PSScriptRoot/config/workflow-input.current.json"

$cfg     = Get-Content "$PSScriptRoot/config/workflow-input.current.json" | ConvertFrom-Json
$headers = @{ 'X-Api-Key' = $env:POSTMAN_API_KEY; 'Content-Type' = 'application/json' }
$outDir  = Join-Path $PSScriptRoot 'artifacts'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# ── Helpers ────────────────────────────────────────────────────────────────────
function Parse-UidFromUrl([string]$url, [string]$segment) {
  if ($url -match "/$segment/([^/?]+)") { return $matches[1] }
  return $url
}

function Test-PostmanReachable {
  try {
    $null = Invoke-RestMethod -Method Get -Uri 'https://api.getpostman.com/me' -Headers $headers -TimeoutSec 15
    return $true
  } catch { return $false }
}

function Save-Artifact([string]$name, $obj) {
  $path = Join-Path $outDir $name
  $obj | ConvertTo-Json -Depth 60 | Set-Content -Path $path -Encoding UTF8
  Write-Host "artifact_saved=$path"
  return $path
}

function Try-LivePost([string]$uri, $body) {
  try {
    $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers `
            -Body ($body | ConvertTo-Json -Depth 60) -TimeoutSec 60
    return [pscustomobject]@{ Success = $true; Response = $resp }
  } catch {
    $msg = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
    Write-Warning "Live POST failed [$uri]: $msg"
    return [pscustomobject]@{ Success = $false; Error = $msg }
  }
}

function Try-LivePut([string]$uri, $body) {
  try {
    $resp = Invoke-RestMethod -Method Put -Uri $uri -Headers $headers `
            -Body ($body | ConvertTo-Json -Depth 60) -TimeoutSec 120
    return [pscustomobject]@{ Success = $true; Response = $resp }
  } catch {
    $msg = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
    Write-Warning "Live PUT failed [$uri]: $msg"
    return [pscustomobject]@{ Success = $false; Error = $msg }
  }
}

# ── Resolve IDs from config ────────────────────────────────────────────────────
$collectionUid  = Parse-UidFromUrl $cfg.collection_id_or_url  'collection'
$environmentUid = Parse-UidFromUrl $cfg.environment_id_or_url 'environment'
$ownerId        = ($collectionUid -split '-')[0]      # e.g. "16491168"

# ── Check reachability (no abort on failure — output-first mode) ──────────────
$apiReachable = Test-PostmanReachable
Write-Host "postman_api_reachable=$apiReachable"

# ── Stage 1: Fork payload ─────────────────────────────────────────────────────
Write-Host ''
Write-Host '=== Stage 1: Fork Collection ==='

$forkPayload = [ordered]@{
  _meta = [ordered]@{
    stage           = 'fork'
    source_uid      = $collectionUid
    target_api      = "POST https://api.getpostman.com/collections/$collectionUid/fork"
    manual_step     = "In Postman UI: right-click source collection → Create a Fork → select workspace '$($cfg.workspace_name)'"
  }
  label     = "US$([regex]::Match($cfg.user_story_ado_link,'\d+$').Value)-fork"
  workspace = [ordered]@{ id = '<<RESOLVED_AT_RUNTIME>>'; type = $cfg.target_workspace_type }
}

$forkArtifact = Save-Artifact 'collection-fork-payload.json' $forkPayload

$forkResult = $null
if ($apiReachable) {
  $forkResult = Try-LivePost "https://api.getpostman.com/collections/$collectionUid/fork" $forkPayload
  if ($forkResult.Success) {
    Write-Host "fork_live=success uid=$($forkResult.Response.collection.uid)"
    $forkedUid = $forkResult.Response.collection.uid
  } else {
    Write-Warning "fork_live=failed — artifact saved for manual upload"
    $forkedUid = '<<MANUALLY_FORKED_UID>>'
  }
} else {
  Write-Warning "fork_live=skipped (API unreachable) — artifact saved for manual upload"
  $forkedUid = '<<MANUALLY_FORKED_UID>>'
}

# ── Stage 2: Load pre-built collection update payload (from prior build step) ──
Write-Host ''
Write-Host '=== Stage 2: Collection Update Payload ==='

$updateSrc = Join-Path $outDir 'postman-collection-payload-us1326051-tc432931.json'
if (Test-Path $updateSrc) {
  $updateRaw = Get-Content $updateSrc -Raw | ConvertFrom-Json
  $updatePayload = [ordered]@{ collection = $updateRaw.collection }
  $targetUid = if ($forkedUid -notlike '*<<*') { $forkedUid } else { $updateRaw.collectionId }
  $updatePayload['_meta'] = [ordered]@{
    stage       = 'update'
    target_uid  = $targetUid
    target_api  = "PUT https://api.getpostman.com/collections/$targetUid"
    manual_step = "In Postman UI: import this file and select Replace for collection uid $targetUid"
  }
  $updateArtifact = Save-Artifact 'collection-update-payload.json' $updatePayload

  if ($apiReachable -and $forkedUid -notlike '*<<*') {
    $putResult = Try-LivePut "https://api.getpostman.com/collections/$targetUid" @{ collection = $updateRaw.collection }
    if ($putResult.Success) {
      Write-Host "update_live=success uid=$($putResult.Response.collection.uid)"
    } else {
      Write-Warning "update_live=failed — artifact saved for manual upload"
    }
  } else {
    Write-Warning "update_live=skipped — artifact saved for manual upload"
  }
} else {
  Write-Warning "update_src_missing=$updateSrc — run build-folder step first to generate it"
  $updateArtifact = 'NOT_GENERATED'
  $targetUid = $forkedUid
}

# ── Stage 3: Pull Request payload ─────────────────────────────────────────────
Write-Host ''
Write-Host '=== Stage 3: Pull Request Payload ==='

$userStoryId = [regex]::Match($cfg.user_story_ado_link, '\d+$').Value
$prPayload = [ordered]@{
  _meta = [ordered]@{
    stage       = 'pr'
    target_uid  = $targetUid
    target_api  = "POST https://api.getpostman.com/collections/$targetUid/pull-requests"
    manual_step = "In Postman UI: open the forked collection → Pull Requests tab → Create Pull Request → assign reviewer '$($cfg.reviewer_postman_user_id)'"
  }
  title       = "US$userStoryId - WinLoss API Test Cases"
  description = "Automated test cases from ADO User Story $userStoryId linked to test suite 1329228. Reviewer: $($cfg.reviewer_postman_user_id)."
  reviewers   = @( @{ username = $cfg.reviewer_postman_user_id } )
  destinationCollectionId = $collectionUid
}

$prArtifact = Save-Artifact 'collection-pr-payload.json' $prPayload

if ($apiReachable -and $targetUid -notlike '*<<*') {
  $prResult = Try-LivePost "https://api.getpostman.com/collections/$targetUid/pull-requests" $prPayload
  if ($prResult.Success) {
    Write-Host "pr_live=success id=$($prResult.Response.pullRequest.id)"
  } else {
    Write-Warning "pr_live=failed — artifact saved for manual upload"
  }
} else {
  Write-Warning "pr_live=skipped — artifact saved for manual upload"
}

# ── Stage 4: Upload instructions ──────────────────────────────────────────────
Write-Host ''
Write-Host '=== Stage 4: Upload Instructions ==='

$instructions = [ordered]@{
  generated_at        = (Get-Date -Format 'o')
  api_reachable       = $apiReachable
  source_collection   = $collectionUid
  forked_collection   = $targetUid
  environment         = $environmentUid
  reviewer            = $cfg.reviewer_postman_user_id
  workspace           = $cfg.workspace_name
  steps = @(
    [ordered]@{
      step   = 1
      action = 'Fork collection'
      status = if ($forkResult -and $forkResult.Success) { 'DONE_LIVE' } else { 'MANUAL_REQUIRED' }
      file   = $forkArtifact
      api    = "POST https://api.getpostman.com/collections/$collectionUid/fork"
      header = 'X-Api-Key: <POSTMAN_API_KEY>'
      note   = "Or use Postman UI: right-click collection → Create a Fork in workspace '$($cfg.workspace_name)'"
    },
    [ordered]@{
      step   = 2
      action = 'Update forked collection (add folders + requests)'
      status = if ($apiReachable -and $targetUid -notlike '*<<*') { 'DONE_LIVE' } else { 'MANUAL_REQUIRED' }
      file   = $updateArtifact
      api    = "PUT https://api.getpostman.com/collections/$targetUid"
      header = 'X-Api-Key: <POSTMAN_API_KEY>'
      note   = "Or use Postman UI: Import → select file → Replace existing collection"
    },
    [ordered]@{
      step   = 3
      action = 'Create pull request and assign reviewer'
      status = if ($apiReachable -and $targetUid -notlike '*<<*') { 'DONE_LIVE' } else { 'MANUAL_REQUIRED' }
      file   = $prArtifact
      api    = "POST https://api.getpostman.com/collections/$targetUid/pull-requests"
      header = 'X-Api-Key: <POSTMAN_API_KEY>'
      note   = "Or use Postman UI: Pull Requests tab → Create Pull Request → Reviewer: $($cfg.reviewer_postman_user_id)"
    }
  )
}

$instrArtifact = Save-Artifact 'upload-instructions.json' $instructions

# ── Stage 5: Persist run-state ─────────────────────────────────────────────────
$state = [ordered]@{
  timestamp               = (Get-Date -Format 'o')
  api_reachable           = $apiReachable
  source_collection_uid   = $collectionUid
  forked_collection_uid   = $targetUid
  source_environment_uid  = $environmentUid
  selected_environment_uid= $environmentUid
  selected_environment_url= $cfg.environment_id_or_url
  artifacts = [ordered]@{
    fork_payload    = $forkArtifact
    update_payload  = $updateArtifact
    pr_payload      = $prArtifact
    instructions    = $instrArtifact
  }
}
$state | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 'config/run-state.json'

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ''
Write-Host '========================================='
Write-Host 'ORCHESTRATOR RUN COMPLETE'
Write-Host '========================================='
Write-Host "api_reachable        : $apiReachable"
Write-Host "forked_collection    : $targetUid"
Write-Host "environment          : $environmentUid"
Write-Host ''
Write-Host 'Artifact outputs:'
Write-Host "  fork payload       : $forkArtifact"
Write-Host "  update payload     : $updateArtifact"
Write-Host "  pr payload         : $prArtifact"
Write-Host "  upload instructions: $instrArtifact"
Write-Host "  run state          : config/run-state.json"
Write-Host ''
if (-not $apiReachable) {
  Write-Host 'ACTION REQUIRED: Postman API was unreachable from this host.'
  Write-Host "Upload artifacts manually using: artifacts/upload-instructions.json"
  Write-Host "Or re-run once outbound TLS to api.getpostman.com:443 is restored."
}
