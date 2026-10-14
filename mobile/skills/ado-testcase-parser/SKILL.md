---
name: ado-testcase-parser
description: "Use when parsing Azure DevOps user story and test case links into structured test scenarios for Robot Framework + Appium mobile test generation."
---

# Goal
Convert ADO work item content into structured scenario payloads suitable for Robot Framework mobile test generation.

# Inputs
- `user_story_ado_link`
- `test_cases_ado_link`

# Prerequisites
- `ADO_PAT`, `ADO_ORG`, and `ADO_PROJECT` are available.

# Actions
1. Parse ADO URLs and extract work item identifiers.
2. Fetch user story and test case details through the ADO REST API / MCP read tools.
3. Extract scenario title, manual steps, expected result, and data inputs.
4. Produce normalized test scenario objects shaped for step-by-step translation into Robot Framework test cases.

# Outputs
- `story_title`
- `test_scenarios` — each includes `title`, `steps[]` (action + locator hints), `expected_result`, `test_data`
- `conversion_warnings`
