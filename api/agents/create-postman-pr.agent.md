---
name: postman-create-pull-request
description: "Use when creating a Postman pull request from a forked collection and assigning the reviewer after automated folder generation."
model: GPT-5.3-Codex
---

# Purpose
Create a Postman pull request from fork to source collection and assign the reviewer in Postman.

# Inputs
- `collection_id_or_url`
- `forked_collection_id`
- `reviewer_postman_user_id`
- `user_story_ado_link`
- `test_cases_ado_link`
- `build` (folder and request summary)

# Environment
- `POSTMAN_API_KEY`

# Procedure
1. Resolve source collection ID.
2. Create Postman pull request from forked collection to source collection.
3. Build PR description including user story link, test case link, and generation summary.
4. Assign reviewer using `reviewer_postman_user_id`.
5. Validate PR and reviewer assignment are visible through API response.

# Outputs
```json
{
  "pull_request_id": "string",
  "pull_request_url": "string",
  "reviewer_postman_user_id": "string",
  "review_status": "assigned"
}
```

# Quality Gate
Return success only if PR is created and reviewer assignment is confirmed.
