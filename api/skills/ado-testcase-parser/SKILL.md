---
name: ado-testcase-parser
description: "Use when parsing Azure DevOps user story and test case links into structured test scenarios for API request and test generation."
---

# Goal
Convert ADO work item content into structured scenario payloads.

# Inputs
- `user_story_ado_link`
- `test_cases_ado_link`

# Prerequisites
- `ADO_PAT`, `ADO_ORG`, and `ADO_PROJECT` are available.

# Actions
1. Parse ADO URLs and extract work item identifiers.
2. Fetch user story and test case details through ADO REST API.
3. Extract scenario title, steps, expected result, and data inputs.
4. Produce normalized test scenario objects.

# Outputs
- `story_title`
- `test_scenarios`
- `conversion_warnings`
