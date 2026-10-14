---
name: postman-analyze-structure
description: "Use when analyzing an existing Postman collection and environment to preserve naming, auth, variable, and test script patterns in generated changes."
model: GPT-5.3-Codex
---

# Purpose
Analyze the forked Postman assets and extract implementation conventions to keep generated requests and tests consistent.

# Inputs
- `forked_collection_id`
- `forked_environment_id`

# Environment
- `POSTMAN_API_KEY`

# Procedure
1. Read full collection JSON including folders, requests, scripts, and auth blocks.
2. Read environment variables and determine scope patterns.
3. Detect folder naming style and request naming conventions.
4. Detect script structure (`pm.test`, assertion style, pre-request usage).

# Outputs
```json
{
  "auth_patterns": ["string"],
  "variable_scopes": ["string"],
  "script_conventions": ["string"],
  "folder_conventions": ["string"],
  "sample_request_templates": ["string"]
}
```

# Quality Gate
Return at least one detected convention from each category.
