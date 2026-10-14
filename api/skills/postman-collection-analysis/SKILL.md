---
name: postman-collection-analysis
description: "Use when extracting folder, request, auth, variable, and script conventions from a Postman collection and environment to guide generated changes."
---

# Goal
Extract reusable structure and coding patterns from existing Postman assets.

# Inputs
- `forked_collection_id`
- `forked_environment_id`

# Prerequisites
- `POSTMAN_API_KEY` is available.

# Actions
1. Read collection JSON and gather folder hierarchy and request patterns.
2. Read environment variables and identify variable naming/scoping conventions.
3. Detect auth usage and script conventions (`pm.test`, assertions, setup patterns).
4. Build a normalized convention summary for downstream generation.

# Outputs
- `auth_patterns`
- `variable_scopes`
- `folder_conventions`
- `script_conventions`
- `sample_request_templates`
