param(
  [Parameter(Mandatory = $true)]
  [string]$PayloadPath,

  [Parameter(Mandatory = $false)]
  [string]$ApiKey = $env:POSTMAN_API_KEY,

  [Parameter(Mandatory = $false)]
  [int]$MaxRetries = 4
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $PayloadPath)) {
  throw "Payload file not found: $PayloadPath"
}

if ([string]::IsNullOrWhiteSpace($ApiKey)) {
  throw 'POSTMAN_API_KEY is required (pass -ApiKey or set env var).'
}

# Force modern TLS on older Windows hosts.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$raw = Get-Content -Path $PayloadPath -Raw | ConvertFrom-Json
if (-not $raw.collectionId -or -not $raw.collection) {
  throw 'Payload must contain collectionId and collection fields.'
}

$uid = [string]$raw.collectionId
$uri = "https://api.getpostman.com/collections/$uid"
$headers = @{
  'X-Api-Key' = $ApiKey
  'Content-Type' = 'application/json'
}
$body = @{ collection = $raw.collection } | ConvertTo-Json -Depth 60

$attempt = 0
while ($attempt -lt $MaxRetries) {
  $attempt++
  try {
    $resp = Invoke-RestMethod -Method Put -Uri $uri -Headers $headers -Body $body -TimeoutSec 180
    Write-Output ("status=success")
    if ($resp.collection.uid) { Write-Output ("uid=" + $resp.collection.uid) }
    if ($resp.collection.id) { Write-Output ("id=" + $resp.collection.id) }
    if ($resp.collection.name) { Write-Output ("name=" + $resp.collection.name) }
    exit 0
  }
  catch {
    $msg = $_.Exception.Message
    Write-Warning ("Attempt $attempt failed: $msg")
    if ($attempt -ge $MaxRetries) {
      throw
    }
    Start-Sleep -Seconds (2 * $attempt)
  }
}
