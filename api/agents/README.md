# Agent Registry

This folder defines a multi-agent workflow for converting ADO test cases into Postman collection changes.

## Agents
- `orchestrator.agent.md`: Entry point and state coordinator.
- `fork-assets.agent.md`: Fork source collection and environment.
- `analyze-structure.agent.md`: Extract conventions from forked assets.
- `build-folder-from-ado.agent.md`: Create new Postman folder from ADO user story and test cases.
- `create-postman-pr.agent.md`: Open Postman PR and assign reviewer.

## Execution Order
1. Fork assets
2. Analyze structure
3. Build folder from ADO
4. Create Postman PR
