---
name: postman-fork-assets
description: "Use when you need to fork a Postman collection and environment before making isolated changes for API/test updates."
model: GPT-5.3-Codex
---

# Purpose
Create a fork of the source Postman collection and environment in the target workspace.

# Inputs
- `workspace_name`
- `collection_id_or_url`
- `environment_id_or_url`

# Environment
- `POSTMAN_API_KEY`

# Procedure
1. Resolve collection and environment IDs from input URL or ID.
2. Fork collection into `workspace_name`.
3. Fork environment into `workspace_name`.
4. Validate both forks are queryable via Postman API.

# Outputs
```json
{
  "forked_collection_id": "string",
  "forked_environment_id": "string",
  "forked_collection_url": "string",
  "forked_environment_url": "string"
}
```

# Quality Gate
Return success only if both forked assets are created and accessible.
