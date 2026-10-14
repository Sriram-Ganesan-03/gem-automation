# Orchestrator Execution Walkthrough

> Script: `api/run-live-postman.ps1`  
> Command: `& .\api\run-live-postman.ps1`

---

## Required Inputs

All inputs are stored in `api/config/workflow-input.current.json` before running the orchestrator.  
Copy `api/config/workflow-input.example.json`, fill in your values, save as `workflow-input.current.json`, then run the script.

### Workflow Inputs

| Field | What to provide |
|---|---|
| `reviewer_postman_user_id` | Postman username of the collection reviewer |
| `workspace_name` | Name of the target Postman team workspace |
| `target_workspace_type` | Always `team` |
| `collection_id_or_url` | Share link or UID of the **source** Postman collection to fork from |
| `environment_id_or_url` | Share link or UID of the Postman environment to associate with the collection |
| `user_story_ado_link` | ADO work item URL (e.g. `https://dev.azure.com/<org>/<project>/_workitems/edit/<id>`) |
| `test_cases_ado_link` | ADO test plan URL (e.g. `https://dev.azure.com/<org>/<project>/_testPlans/execute?planId=<id>&suiteId=<id>`) |
| `folder_name_override` | `null` to auto-derive folder names from test case categories, or a custom string to override |
| `run_mode` | `execute` to run live; `dry-run` to generate artifacts only without making API calls |
| `execution_confirmation` | Must be exactly `APPROVED_EXECUTE` when `run_mode` is `execute` |

### Safety Guard Flags _(must all remain at these values)_

| Flag | Required Value | Purpose |
|---|---|---|
| `allow_ado_mutation` | `false` | Block any ADO write operation |
| `allow_probe_resources` | `false` | Prevent probe calls that mutate live resources |
| `ado_access_mode` | `read-only` | Restrict ADO MCP tools to reads only |
| `environment_strategy` | `use-input-existing` | Use the environment from input; never create a new one |
| `allow_environment_creation` | `false` | Double-guard against environment creation |
| `ado_tool_calls_mode` | `read-wrapper-only` | ADO calls must go through the read-only wrapper |
| `ado_write_tools_disabled` | `true` | Hard disable for all ADO write tools |

### Environment Variables _(must be set before running)_

| Variable | Purpose |
|---|---|
| `POSTMAN_API_KEY` | Authenticates all Postman API calls |
| `ADO_PAT` | Azure DevOps Personal Access Token (read scope only) |
| `ADO_ORG` | ADO organisation name |
| `ADO_PROJECT` | ADO project name |

---

## Step 1 — Preflight Guard Rails _(always runs, blocks if any check fails)_

- Reads `api/config/workflow-input.current.json` and `api/config/ado-operation-guardrails.json`.
- Validates all required fields are present and non-empty.
- Checks constant safety policies:
  - `allow_ado_mutation = false`
  - `allow_probe_resources = false`
  - `ado_access_mode = read-only`
  - `target_workspace_type = team`
  - `environment_strategy = use-input-existing`
  - `allow_environment_creation = false`
  - `ado_tool_calls_mode = read-wrapper-only`
  - `ado_write_tools_disabled = true`
- Confirms `run_mode = execute` with `execution_confirmation = APPROVED_EXECUTE`.
- Confirms env vars `POSTMAN_API_KEY`, `ADO_PAT`, `ADO_ORG`, `ADO_PROJECT` are set.
- **If any check fails → hard stop here, nothing else runs.**

---

## Step 2 — Reachability Probe _(non-blocking)_

- Makes a single `GET https://api.getpostman.com/me` with a 15-second timeout.
- Sets an internal flag `$apiReachable = true / false`.
- Does **not** abort if unreachable — switches to output-only mode.

---

## Step 3 — Stage 1: Fork Collection _(produces artifact regardless)_

- Builds a fork payload targeting the source collection and team workspace from `workflow-input.current.json`.
- Writes → `api/artifacts/collection-fork-payload.json`
- **If API reachable:** `POST https://api.getpostman.com/collections/{source-collection-uid}/fork` and captures the new forked collection UID.
- **If API blocked:** logs warning, sets forked UID placeholder for manual resolution, continues to next stage.

---

## Step 4 — Stage 2: Collection Update _(produces artifact regardless)_

- Reads the collection payload generated from the ADO test cases in the linked test suite.
- Wraps it in a `collection` key and writes → `api/artifacts/collection-update-payload.json`
- Target: the forked collection produced in Stage 1.
- Folders and requests are derived automatically from the ADO test case categories in the linked test suite.
- **If API reachable + fork succeeded:** `PUT https://api.getpostman.com/collections/{forked-collection-uid}`
- **If API blocked:** logs warning, artifact saved for manual upload.

---

## Step 5 — Stage 3: Pull Request _(produces artifact regardless)_

- Builds a PR payload:
  - Title: auto-derived from the user story ID and test plan
  - Description: traceability links back to the ADO user story and test suite
  - Reviewer: value of `reviewer_postman_user_id` from workflow input
- Writes → `api/artifacts/collection-pr-payload.json`
- **If API reachable:** `POST https://api.getpostman.com/collections/{forked-collection-uid}/pull-requests`
- **If API blocked:** artifact saved for manual upload.

---

## Step 6 — Stage 4: Upload Instructions _(always runs)_

- Assembles `api/artifacts/upload-instructions.json` with:
  - Status of each step (`DONE_LIVE` or `MANUAL_REQUIRED`)
  - Exact API endpoint, required header, and file path for each step
  - Postman UI alternative for each step
- Saves `api/config/run-state.json` with all resolved UIDs and artifact paths.

---

## Step 7 — Summary Printed to Terminal

```
api_reachable        : True/False
forked_collection    : <resolved-uid>
environment          : <resolved-uid>
  fork payload       : api/artifacts/collection-fork-payload.json
  update payload     : api/artifacts/collection-update-payload.json
  pr payload         : api/artifacts/collection-pr-payload.json
  upload instructions: api/artifacts/upload-instructions.json
```

If API is blocked, prints explicit `ACTION REQUIRED` with the instructions file path.

---

## API Reachability Behaviour

| Stage              | If API blocked           | If API reachable          |
|--------------------|--------------------------+---------------------------|
| Preflight          | ✅ always runs           | ✅ always runs            |
| Fork               | JSON artifact only       | Live fork + artifact      |
| Update collection  | JSON artifact only       | Live PUT + artifact       |
| Pull request       | JSON artifact only       | Live PR + artifact        |
| Instructions       | Always written           | Always written            |

> When your network allows outbound HTTPS to `api.getpostman.com:443`, all three live calls happen automatically on the same `& .\run-live-postman.ps1` command — no other change needed.  
> If blocked, follow the step-by-step instructions in `api/artifacts/upload-instructions.json` to apply each artifact manually via the Postman API or UI.
