---
name: postman-build-folder-from-ado
description: "Use when converting ADO user story and test case links into a new Postman collection folder with generated requests and tests."
model: GPT-5.3-Codex
---

# Purpose
Fetch user story and test cases from ADO, derive folder name, and create a new folder with matching requests/tests inside the forked collection.

# Inputs
- `forked_collection_id`
- `forked_environment_id`
- `user_story_ado_link`
- `test_cases_ado_link`
- `folder_name_override` (optional)
- `analysis` (conventions from analyze step)

# Environment
- `POSTMAN_API_KEY`
- `ADO_PAT`
- `ADO_ORG`
- `ADO_PROJECT`

# Procedure
1. Resolve ADO identifiers **deterministically** by running `api/scripts/parse-ado-refs.ps1 -ConfigPath api/config/workflow-input.current.json` (emits `work_item_id` / `plan_id` / `suite_id` / `org` / `project` from the links — do not parse URLs by hand), then fetch work item + test case details via ADO REST APIs.
2. Extract scenario names, steps, expected outcomes, and data inputs.
3. Compute folder name from user story title plus test case context, unless override is supplied.
4. Generate requests and tests respecting extracted collection conventions.
5. Create the new folder and attach generated requests in the forked collection.

# Outputs
```json
{
  "folder_name": "string",
  "new_folder_id": "string",
  "request_count": 0,
  "test_count": 0,
  "generated_request_ids": ["string"]
}
```

# Quality Gate
> **Structural self-check via script.** Before applying the collection, write the intended payload (`{ collectionId, collection }`) to `api/artifacts/collection-payload.json` and run `api/scripts/validate-postman-payload.ps1 -PayloadPath api/artifacts/collection-payload.json`. It verifies the v2.1 schema and that every request has a name, method, and url. Fix any reported issues before the PUT — do not hand-verify the collection JSON.

- Every fetched test case is either converted or listed under `conversion_warnings`.
- No generated request should violate detected auth or variable conventions.
