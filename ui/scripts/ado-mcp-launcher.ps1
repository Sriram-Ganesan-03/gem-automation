# ado-mcp-launcher.ps1 — Azure DevOps MCP server PAT authentication wrapper
#
# Reads a raw PAT from the ADO_RAW_PAT environment variable (supplied by the
# VS Code `${input:adoPat}` secure prompt), base64-encodes it as `email:pat`,
# exposes it via PERSONAL_ACCESS_TOKEN, and launches the Microsoft
# @azure-devops/mcp server with `--authentication pat` (no browser sign-in).
#
# This mirrors the proven approach used by the-fridge-qa-bot. It is invoked by
# VS Code via mcp.json — do not run it manually.

$ErrorActionPreference = 'Stop'

$pat = $env:ADO_RAW_PAT
if (-not $pat) {
  Write-Error "ADO_RAW_PAT environment variable is not set. Configure the 'adoPat' input in mcp.json."
  exit 1
}

# Azure DevOps Basic auth uses `<anything>:<pat>` — the username is ignored.
$email = git config user.email 2>$null
if (-not $email) { $email = "$env:USERNAME@everi.com" }

$bytes = [System.Text.Encoding]::UTF8.GetBytes("${email}:${pat}")
$env:PERSONAL_ACCESS_TOKEN = [System.Convert]::ToBase64String($bytes)

# Organization is `everi`. Domains match the loyalty-automation-agent workflows:
# core (projects/identities), work + work-items (user stories/WIQL),
# search (work item search), test-plans (test case fetch), repositories (branches/PRs).
& npx -y '@azure-devops/mcp@2.8.0' everi --authentication pat -d core work work-items search test-plans repositories
