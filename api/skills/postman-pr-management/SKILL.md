---
name: postman-pr-management
description: "Use when creating a Postman pull request from fork to source collection and assigning a reviewer with traceability links."
---

# Goal
Create and validate a Postman pull request with reviewer assignment.

# Inputs
- `source_collection_id`
- `forked_collection_id`
- `reviewer_postman_user_id`
- `user_story_ado_link`
- `test_cases_ado_link`
- `build_summary`

# Prerequisites
- `POSTMAN_API_KEY` is available.

# Actions
1. Create pull request from forked collection to source collection.
2. Build PR description with folder summary and ADO traceability links.
3. Assign reviewer via Postman user ID.
4. Verify PR status and assignment.

# Outputs
- `pull_request_id`
- `pull_request_url`
- `reviewer_postman_user_id`
- `review_status`
