---
name: postman-fork
description: "Use when you need to fork a Postman collection and environment into a workspace before applying isolated API or test updates."
---

# Goal
Fork source Postman collection and environment into a target workspace.

# Inputs
- `workspace_name`
- `collection_id_or_url`
- `environment_id_or_url`

# Prerequisites
- `POSTMAN_API_KEY` is available.

# Actions
1. Resolve source asset IDs from URL or raw ID.
2. Call Postman collection fork operation.
3. Call Postman environment fork operation.
4. Validate forked assets exist and are readable.

# Outputs
- `forked_collection_id`
- `forked_collection_url`
- `forked_environment_id`
- `forked_environment_url`
