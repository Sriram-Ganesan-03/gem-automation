---
name: postman-folder-generator
description: "Use when creating a new Postman collection folder and generating requests and tests from parsed scenarios while preserving existing conventions."
---

# Goal
Create a new folder in the forked collection and populate requests/tests from parsed ADO scenarios.

# Inputs
- `forked_collection_id`
- `forked_environment_id`
- `test_scenarios`
- `story_title`
- `folder_name_override`
- `analysis`

# Prerequisites
- `POSTMAN_API_KEY` is available.

# Actions
1. Build deterministic folder name from story title and scenario context, unless override is provided.
2. Generate request definitions from scenario steps.
3. Generate `pm.test` assertions from expected outcomes.
4. Apply auth and variable conventions from analysis outputs.
5. Create folder and append generated requests in the forked collection.

# Outputs
- `folder_name`
- `new_folder_id`
- `generated_request_ids`
- `request_count`
- `test_count`
- `conversion_warnings`
