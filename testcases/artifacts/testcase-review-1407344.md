# Test Case Review - US 1407344: TGO - Tenant Onboarding Workflow and Lifecycle Refactor

Authoring phase: development (baseline) | run_mode: dry-run | output_mode: excel | UI exploration: not enabled

## Intake Summary
```
Resolved Story ID     : 1407344
Resolved Story Title  : TGO – Tenant Onboarding Workflow and Lifecycle Refactor (User Story, In Development, Sprint 174, 8 SP, P1)
Project               : Loyalty Kiosk
Parent                : 1375449 (TGO Multi-Region Tenant Onboarding Refactor - Feature, In Sprint)
Children Reviewed     : 0 - no non-Task children
Children Skipped      : 4 (1471705, 1488339, 1488340, 1488342) - Task children, not reviewed (titles only: Wizard mode for creation / Non-Wizard mode for update tenant)
Predecessors Reviewed : none linked
Successors Reviewed   : 1 (1411893 - TGO Hierarchical Region and Site Management, Dev Review)
Related Reviewed      : none linked
Other Links Reviewed  : Artifact: PR 185578 (not reviewed); parent siblings consulted for scope: 1411909 (Region Architecture/Migration), 1411910 (Permissions), bugs 1476792, 1474065, 1459456
Comments              : 1 on story (prioritise over Creek Nation); 3 on parent (CR10/CR11 planning); 0 on successor
Attachment IDs Found  : none on story / parent / successor
Local Docs Reviewed   : 0
Feature/Spec Files    : 0
Wiki Pages Reviewed   : 2 (Tgo-Tenant-Onboarding-from-Multi-Tenant-UI; Automation/TCS-Functional-Items/TGO/Connector-Configuration-and-Tenant-Onboarding)
Reference Repo URL    : n/a
Test Instance URL     : https://trilogy-go-qa01.purplecheckpoint.com/tgo
UI Exploration        : not enabled (story In Development)
Unresolved Artifacts  : 2 (PR 185578 - diff not reviewed; ui_exploration - disabled)
```

## Requirements
| Req ID | Source | Requirement | Risk |
|---|---|---|---|
| REQ-001 | [Work Item AC] AC1 | Tenant onboarding uses workflow/tab navigation containing (1) Tenant Information and (2) Regions/Sites. | Medium |
| REQ-002 | [Work Item AC] AC2 | Save & Next functionality works correctly (persists current step and advances to the next step). | High |
| REQ-003 | [Work Item AC] AC3 | Tenant initially saves in Pending state and does not become Active immediately. | High |
| REQ-004 | [Work Item AC] AC4 | Tenant transitions to Active after onboarding completion. | High |
| REQ-005 | [Work Item AC] AC5 | Users can continue onboarding later (return to a Pending tenant and resume). | High |
| REQ-006 | [Work Item AC] AC6 | Existing Tenants remain unaffected / functional after deployment. | High |
| REQ-007 | [Work Item AC] AC7 | Region/Site management is accessible within the onboarding flow. | Medium |
| REQ-008 | Description - Tenant Information Section | Tenant Information section contains Tenant Name, Tenant Description, Trilogy Go Domain, consistent with current onboarding fields. | Medium |
| REQ-009 | Description - Tenant Lifecycle Management / Validation | Tenant becomes Active only after required onboarding steps are completed and Region/Site configuration requirements are satisfied; incomplete onboarding shall not activate the Tenant. | High |
| REQ-010 | Description - Validation | Users shall not bypass required onboarding steps. | High |
| REQ-011 | Description - Validation | Tenant onboarding progress shall persist between sessions. | High |
| REQ-012 | Description - Navigation Refactor | Region management and Site management are consolidated under the Tenant onboarding experience instead of disconnected pages. | Medium |
| REQ-013 | Description - UI/UX Workflow Navigation | Onboarding visually guides the user through Tenant setup, Region setup and Site setup. | Low |
| REQ-014 | Description - UI/UX Component Reuse | Existing Trilogy workflow/tab patterns are reused instead of new onboarding components. | Low |
| REQ-015 | Successor #1411893 | Sites must always belong to a Region; orphan Sites shall not exist. | High |
| REQ-016 | Successor #1411893 | Duplicate Region names within the same Tenant shall not be allowed. | Medium |
| REQ-017 | Successor #1411893 | Region contains Region Name, Trilogy Base URL/domain, Region Description; empty state message and Add Region action are shown when no Regions exist; nested Region/Site grid with expand/collapse. | Medium |
| REQ-018 | Parent #1375449 (sibling US 1411909 Migration Support) | Existing Tenants/Sites migrate to the Region architecture: existing Site mappings, Trilogy Base URL relationships and active Tenants preserved; no orphan Sites. | High |
| REQ-019 | Parent #1375449 (sibling US 1411910 Permissions) | Users with only View TGO Settings can view Tenant onboarding details and Region/Site hierarchy but cannot modify onboarding configuration, Regions or Sites. | Medium |
| REQ-020 | Wiki: Automation/TCS-Functional-Items/TGO/Connector-Configuration-and-Tenant-Onboarding | An already existing Tenant cannot be created again. | Medium |
| REQ-021 | Wiki (Tenants tab + icon) / sibling US 1411909 (/tgo routing) | Onboarding is launched from TGO (/tgo) > Tenants > + icon. | Low |
| REQ-022 | Wiki: Connector-Configuration-and-Tenant-Onboarding (Trilogy System > Tenant > Onboard) | Tenants created in TGO are onboarded from the Trilogy platform (System > Tenant > Search by Trilogy Domain + Trilogy Go Domain > Onboard > Check Connectivity). | High |

## Requirement Analysis (Phase 0)
### Business Rules
- BR1: A newly created tenant is Pending, never Active on creation (REQ-003).
- BR2: Pending -> Active only when Tenant Information is complete AND Region/Site requirements are satisfied (REQ-004, REQ-009).
- BR3: Required steps cannot be bypassed (REQ-010).
- BR4: Onboarding progress persists between sessions and can be resumed (REQ-005, REQ-011).
- BR5: Existing tenants keep functioning and are not moved back to Pending (REQ-006, REQ-018).
- BR6: Sites always belong to a Region; Region names are unique per tenant (REQ-015, REQ-016).
- BR7: A tenant that already exists cannot be created again (REQ-020).

### Functional Requirements
- Workflow/tab navigation: Tenant Information -> Regions/Sites (REQ-001).
- Save & Next per step (REQ-002).
- Tenant lifecycle Pending/Active (REQ-003, REQ-004, REQ-009).
- Resume onboarding later (REQ-005).
- Region/Site management inside onboarding (REQ-007, REQ-012, REQ-015..REQ-017).
- Tenant Information fields (REQ-008).

### Non Functional Requirements
- Usability: guided step indicator, reuse of Trilogy tab patterns (REQ-013, REQ-014).
- Reliability/Recovery: no duplicate or partial tenants on failure/double submit (REQ-002).
- Security: no bypass through deep links or API; read-only permission enforcement (REQ-010, REQ-019).
- Backward compatibility: migration of existing tenants (REQ-006, REQ-018).
- No performance NFR stated (see Missing Requirements).

### Dependencies
- Successor US 1411893 (Hierarchical Region and Site Management, Dev Review) - provides the nested Region/Site grid, Region/Site modals and validations used by the Regions/Sites step.
- Sibling US 1411909 (Region Architecture, Backend and Migration, Closed) - lifecycle state storage, Region entity, migration of existing tenants, /tgo routing.
- Sibling US 1411910 (Permissions and Access, Ready for Development) - View TGO Settings permission; REQ-019 cases are blocked until it is delivered.
- Trilogy platform tenant onboarding (System > Tenant) consumes TGO tenants (wiki).
- PR 185578 linked to the story (not reviewed - artifact link only).

### Constraints
- Story is In Development; live UI exploration disabled - exact labels (tab names, button text, status labels, messages) must be confirmed against the build.
- Task children 1471705, 1488339, 1488340, 1488342 skipped per policy; their titles indicate a Wizard mode for creation and a Non-Wizard mode for updating a tenant.
- Full Region/Site CRUD, reassignment and deletion rules are owned by US 1411893 and only exercised here as far as onboarding needs.

### Assumptions
- A1: Completing onboarding requires at least one Region with at least one Site (AC does not define the minimum).
- A2: Regions/Sites step is not reachable for a brand-new tenant until Tenant Information is saved.
- A3: Editing an existing tenant uses a non-wizard mode (free tab navigation) - from Task 1488342 title.
- A4: Activation happens automatically on completion of the last required step (or via an explicit Complete/Finish action if present).
- A5: Field limits/format rules for Tenant Name and Trilogy Go Domain are those of the current Add Tenant form.

### Test Conditions
| ID | Req | Condition | Risk |
|---|---|---|---|
| TCOND-001 | REQ-001 | Onboarding opens as an ordered tab/workflow with Tenant Information then Regions/Sites. | Medium |
| TCOND-002 | REQ-002 | Save & Next saves the step data exactly once and advances; failures keep the user on the step with data retained. | High |
| TCOND-003 | REQ-003 | First save of a new tenant creates it with status Pending (UI + persistence). | High |
| TCOND-004 | REQ-004 | Pending -> Active only after all required steps and Region/Site requirements are complete. | High |
| TCOND-005 | REQ-005 | A Pending tenant can be re-opened and resumed at the next incomplete step with saved data prefilled. | High |
| TCOND-006 | REQ-006 | Pre-existing tenants keep Active status, sites, settings and connectivity after deployment and after edits. | High |
| TCOND-007 | REQ-007 | Regions and Sites can be created/viewed from the Regions/Sites step of onboarding. | Medium |
| TCOND-008 | REQ-008 | Tenant Information fields exist and validate consistently with the existing Add Tenant form. | Medium |
| TCOND-009 | REQ-009 | Every incomplete combination of steps leaves the tenant Pending. | High |
| TCOND-010 | REQ-010 | Later steps/activation cannot be reached through UI, deep link, or direct API before required steps are done. | High |
| TCOND-011 | REQ-011 | Saved progress survives logout/login, browser change, refresh and session timeout. | High |
| TCOND-012 | REQ-012 | Region/Site management is reached through the tenant, not via a disconnected page. | Medium |
| TCOND-013 | REQ-013 | A visible progress indicator shows current/completed steps. | Low |
| TCOND-014 | REQ-014 | Workflow tabs look and behave like existing Trilogy tab patterns. | Low |
| TCOND-015 | REQ-015 | Site creation inside onboarding requires a Region. | High |
| TCOND-016 | REQ-016 | Region name uniqueness is enforced per tenant during onboarding. | Medium |
| TCOND-017 | REQ-017 | Regions/Sites step shows empty state, Region modal fields and nested grid. | Medium |
| TCOND-018 | REQ-018 | Post-deployment data for existing tenants is intact and hierarchical. | High |
| TCOND-019 | REQ-019 | Read-only users see onboarding read-only; writes are blocked in UI and API. | Medium |
| TCOND-020 | REQ-020 | Duplicate tenant creation is rejected in the new workflow. | Medium |
| TCOND-021 | REQ-021 | The Add Tenant entry point opens the new workflow. | Low |
| TCOND-022 | REQ-022 | Downstream Trilogy onboarding/connectivity works for new (completed) and existing tenants; Pending handling is defined. | High |

## Coverage Summary
Total test cases: 65

**by_type**: Positive=28, Negative=30, Boundary=7

**by_level**: Component=0, Integration=12, System=49, UAT=4

**by_category**: Functional=42, Security=7, Performance=1, Accessibility=1, Compatibility=0, Recovery=3, API=3, Database=3, Usability=5

**by_technique**: EP=22, BVA=6, Decision Table=5, State Transition=12, Pairwise=0, Error Guessing=13, Exploratory=7

Examples 1:1 mapping: n/a (no SpecFlow/feature files provided) - examples_mapping_confirmed = true

## Requirements Traceability Matrix
| Req ID | Test Conditions | Test Case IDs | Levels | Techniques | Covered |
|---|---|---|---|---|---|
| REQ-001 | TCOND-001 | TC-001, TC-002, TC-003, TC-006, TC-018, TC-021, TC-051 | System | EP, Exploratory, State Transition | True |
| REQ-002 | TCOND-002 | TC-008, TC-009, TC-018, TC-019, TC-020, TC-021, TC-022, TC-034 | Integration, System | EP, Error Guessing, State Transition | True |
| REQ-003 | TCOND-003 | TC-014, TC-023, TC-024, TC-025, TC-037, TC-056, TC-063, TC-064 | Integration, System, UAT | EP, Exploratory, State Transition | True |
| REQ-004 | TCOND-004 | TC-026, TC-027, TC-028, TC-029, TC-030, TC-039, TC-059, TC-063 | Integration, System, UAT | BVA, Decision Table, EP, Error Guessing, Exploratory, State Transition | True |
| REQ-005 | TCOND-005 | TC-022, TC-035, TC-036, TC-037, TC-040 | System, UAT | EP, Error Guessing, State Transition | True |
| REQ-006 | TCOND-006 | TC-051, TC-052, TC-053, TC-054, TC-055, TC-056, TC-057 | Integration, System | EP, State Transition | True |
| REQ-007 | TCOND-007 | TC-026, TC-041, TC-042, TC-043, TC-050, TC-051, TC-065 | System, UAT | BVA, EP, Exploratory, State Transition | True |
| REQ-008 | TCOND-008 | TC-007, TC-008, TC-009, TC-010, TC-011, TC-012, TC-013, TC-016, TC-017 | Integration, System | BVA, EP, Error Guessing | True |
| REQ-009 | TCOND-009 | TC-024, TC-026, TC-027, TC-028, TC-029, TC-030, TC-031, TC-032, TC-049, TC-058 | Integration, System | BVA, Decision Table, EP, Error Guessing, Exploratory, State Transition | True |
| REQ-010 | TCOND-010 | TC-003, TC-028, TC-031, TC-032, TC-033, TC-034, TC-045, TC-061 | Integration, System | Decision Table, Error Guessing, State Transition | True |
| REQ-011 | TCOND-011 | TC-020, TC-036, TC-038, TC-039, TC-040 | Integration, System | Error Guessing, State Transition | True |
| REQ-012 | TCOND-012 | TC-050 | UAT | Exploratory | True |
| REQ-013 | TCOND-013 | TC-002, TC-006 | System | Exploratory, State Transition | True |
| REQ-014 | TCOND-014 | TC-005 | UAT | Exploratory | True |
| REQ-015 | TCOND-015 | TC-043, TC-044, TC-045, TC-053 | Integration, System | Decision Table, EP, Error Guessing | True |
| REQ-016 | TCOND-016 | TC-046, TC-047, TC-048 | System | BVA, EP | True |
| REQ-017 | TCOND-017 | TC-041, TC-042, TC-043, TC-049, TC-065 | System | BVA, EP | True |
| REQ-018 | TCOND-018 | TC-052, TC-053, TC-057 | Integration, System | EP | True |
| REQ-019 | TCOND-019 | TC-060, TC-061, TC-062 | Integration, System | Decision Table, Error Guessing | True |
| REQ-020 | TCOND-020 | TC-012, TC-014, TC-015 | System | BVA, EP, Error Guessing | True |
| REQ-021 | TCOND-021 | TC-001, TC-004 | System | EP | True |
| REQ-022 | TCOND-022 | TC-054, TC-058, TC-059, TC-064 | Integration, System, UAT | EP, Exploratory | True |

## Risk Coverage Summary
Cases by Risk Rating: High=30, Medium=30, Low=5

| High-risk Req | Cases | Covered |
|---|---|---|
| REQ-002 | 8 | True |
| REQ-003 | 8 | True |
| REQ-004 | 8 | True |
| REQ-005 | 5 | True |
| REQ-006 | 7 | True |
| REQ-009 | 10 | True |
| REQ-010 | 8 | True |
| REQ-011 | 5 | True |
| REQ-015 | 4 | True |
| REQ-018 | 3 | True |
| REQ-022 | 4 | True |

## Missing Requirements
- No explicit definition of 'onboarding completion' (minimum Regions/Sites, is a Finish/Complete action required?).
- No field-level validation rules (max lengths, allowed characters, Trilogy Go Domain format, is Tenant Description mandatory?).
- No definition of how Pending tenants behave in the Trilogy platform onboarding search, Service Activity Report and TGO Settings.
- No rule for Active tenants whose last Region/Site is soft-deleted (revert to Pending or stay Active).
- No audit/logging requirement for tenant creation and Pending -> Active transitions.
- No performance NFR for the Regions/Sites step with large hierarchies.
- No rule for Pending tenants that are abandoned (expiry/cleanup) or for deleting a Pending tenant.

## Ambiguous Requirements
| Req ID | Issue | Assumption Made |
|---|---|---|
| REQ-004 | 'Onboarding completion' is not defined. | At least one Region with at least one Site plus saved Tenant Information (A1/A4). |
| REQ-008 | 'Consistent with current onboarding fields wherever possible' - validation rules not listed. | Same mandatory markers/limits as the current Add Tenant form (A5); observed limits recorded during execution. |
| REQ-012 | Unclear whether the standalone Sites page is removed, hidden or redirected. | Region/Site management must be reachable from the tenant; any remaining standalone page must show the same hierarchy (no disconnected data). |
| REQ-019 | Permission story 1411910 is Ready for Development - read-only behaviour may not exist in this build. | Cases kept; mark Blocked if the permission is not deployed. |
| REQ-022 | Whether a Pending tenant can be found/onboarded from the Trilogy platform is not defined. | Outcome recorded and raised to PO; TGO status must not become Active through the Trilogy side alone. |
| REQ-001 | Edit of existing tenants - wizard vs non-wizard mode only visible in Task titles. | Existing tenant edit uses free tab navigation (A3). |

## Additional Exploratory Test Ideas
- Open the same new-tenant workflow in two browser tabs and Save & Next in both - check for duplicate Pending tenants.
- Change the Trilogy Go Domain of a Pending tenant after Regions were added and check Region/Site data remains linked.
- Soft-delete the only Site of a just-activated tenant and observe the status (see Missing Requirements).
- Use browser Back/Forward repeatedly across the tabs after each Save & Next and look for stale forms or re-submissions.
- Resume a Pending tenant after the build is redeployed (app restart) to confirm server-side persistence rather than local storage.
- Try onboarding with very long Unicode tenant names (accents, emoji, RTL) and check list, workflow header and Activity Report rendering.
- Check the Tenants list sort/filter by status with a mix of Pending and Active tenants.

## Test Cases
### TC-001 - TGO - AC1 - Add Tenant Opens Workflow With Ordered Tabs
- **Req:** REQ-001, REQ-021 | **Type:** Positive | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 1 | **Severity:** High | **Risk:** Medium | **Automation:** High
- **Test Condition:** Onboarding opens as a tab/workflow with Tenant Information first and Regions/Sites second
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** N/A

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Observe the workflow header/tab bar | Tenant Onboarding workflow opens (not the old single Add Tenant form). Tabs appear in order: 1) Tenant Information, 2) Regions/Sites. Tenant Information is the active tab and its fields are empty. |

### TC-002 - TGO - AC1 - Step Indicator Shows Tenant Region Site Progress
- **Req:** REQ-013, REQ-001 | **Type:** Positive | **Level:** System | **Technique:** State Transition | **Category:** Usability
- **Priority:** 3 | **Severity:** Low | **Risk:** Low | **Automation:** Medium
- **Test Condition:** Workflow visually guides the user through Tenant, Region and Site setup
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Tenant Name: QA_TGO_Onb_<yyyyMMddHHmm>; Tenant Description: QA onboarding workflow test; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com; Region Name: QA_Region_East; Trilogy Base URL: loyalty-atm-a02.purplecheckpoint.com; Region Description: QA east region; Site: QA_Site_01 with the existing mandatory Site fields populated per the current Site form

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Note the step indicator state |  |
| 5 | Enter Tenant Name, Tenant Description and Trilogy Go Domain from Test Data and click 'Save & Next' |  |
| 6 | Note the step indicator state |  |
| 7 | Add a Region and a Site under it from Test Data |  |
| 8 | Note the step indicator state | Indicator always highlights the current step (Tenant setup -> Region setup -> Site setup) and marks completed steps as done; it never shows a later step as complete before its data is saved. |

### TC-003 - TGO - AC1 - Regions Sites Tab Locked Before Tenant Information Saved
- **Req:** REQ-001, REQ-010 | **Type:** Negative | **Level:** System | **Technique:** State Transition | **Category:** Functional
- **Priority:** 1 | **Severity:** High | **Risk:** High | **Automation:** High
- **Test Condition:** Regions/Sites step cannot be opened for a new tenant before Tenant Information is saved
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Tenant Name: QA_TGO_Onb_<yyyyMMddHHmm>; Tenant Description: QA onboarding workflow test; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Without entering data click the 'Regions/Sites' tab |  |
| 5 | Enter Tenant Name, Tenant Description and Trilogy Go Domain from Test Data but do NOT click Save & Next |  |
| 6 | Click the 'Regions/Sites' tab again | Regions/Sites tab is disabled or shows a message to complete Tenant Information first; the user stays on Tenant Information; no tenant is created in the Tenants list. |

### TC-004 - TGO - Entry Point - Tenants Plus Icon Under /tgo
- **Req:** REQ-021 | **Type:** Positive | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 3 | **Severity:** Medium | **Risk:** Low | **Automation:** High
- **Test Condition:** Add Tenant entry point under /tgo launches the new onboarding workflow
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants (list).
- **Test Data:** URL: https://trilogy-go-qa01.purplecheckpoint.com/tgo

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Check the browser URL | Tenants list loads under /tgo; '+' opens the Tenant Onboarding workflow on the Tenant Information tab and the URL stays under the /tgo route. |

### TC-005 - TGO - UI Consistency - Workflow Reuses Trilogy Tab Pattern
- **Req:** REQ-014 | **Type:** Positive | **Level:** UAT | **Technique:** Exploratory | **Category:** Usability
- **Priority:** 4 | **Severity:** Low | **Risk:** Low | **Automation:** Not Feasible
- **Test Condition:** Workflow tabs reuse the existing Trilogy workflow/tab pattern
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab. An existing Trilogy/TGO tabbed page is available for comparison (e.g. TGO Settings under Admin Configuration).
- **Test Data:** N/A

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Compare tab styling, active/inactive states, button placement and spacing with the existing tabbed page |  |
| 5 | Resize the browser to 1366x768 and 1920x1080 | Onboarding tabs use the same look and behaviour as the existing Trilogy tab component (styles, active indicator, button placement); no clipped or overlapping elements at both resolutions. |

### TC-006 - TGO - Accessibility - Keyboard Navigation Through Workflow
- **Req:** REQ-001, REQ-013 | **Type:** Positive | **Level:** System | **Technique:** Exploratory | **Category:** Accessibility
- **Priority:** 3 | **Severity:** Medium | **Risk:** Low | **Automation:** Low
- **Test Condition:** Workflow tabs, fields and Save & Next are keyboard operable with correct focus order
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab. Screen reader (NVDA) available.
- **Test Data:** Tenant Name: QA_TGO_Onb_<yyyyMMddHHmm>; Tenant Description: QA onboarding workflow test; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Using only Tab/Shift+Tab move through the tabs, Tenant Name, Tenant Description, Trilogy Go Domain and Save & Next |  |
| 5 | Fill the fields from Test Data with the keyboard and press Enter/Space on 'Save & Next' |  |
| 6 | With NVDA running, move focus to the tab bar | Focus order follows the visual order with a visible focus ring; Save & Next works from the keyboard and moves focus to the Regions/Sites step; the screen reader announces field labels, required state and the active tab/step. |

### TC-007 - TGO - Tenant Information - Fields Present And Consistent
- **Req:** REQ-008 | **Type:** Positive | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 2 | **Severity:** Medium | **Risk:** Medium | **Automation:** High
- **Test Condition:** Tenant Information shows Tenant Name, Tenant Description and Trilogy Go Domain consistent with the existing form
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab. Screenshot of the pre-deployment Add Tenant form available for comparison.
- **Test Data:** N/A

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Inspect the Tenant Information tab fields, labels and required markers | Exactly the fields Tenant Name, Tenant Description and Trilogy Go Domain are shown with labels, placeholders and required markers matching the pre-deployment Add Tenant form; no Region/Site fields are on this tab. |

### TC-008 - TGO - Tenant Information - Blank Tenant Name Rejected
- **Req:** REQ-008, REQ-002 | **Type:** Negative | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 2 | **Severity:** High | **Risk:** Medium | **Automation:** High
- **Test Condition:** Save & Next is blocked when Tenant Name is empty
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Tenant Name: <blank>; Tenant Description: QA onboarding workflow test; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Leave Tenant Name empty and fill the other fields from Test Data |  |
| 5 | Click 'Save & Next' | Inline required-field validation is shown on Tenant Name; user stays on Tenant Information; no tenant (Pending or otherwise) is created in the Tenants list. |

### TC-009 - TGO - Tenant Information - Blank Trilogy Go Domain Rejected
- **Req:** REQ-008, REQ-002 | **Type:** Negative | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 2 | **Severity:** High | **Risk:** Medium | **Automation:** High
- **Test Condition:** Save & Next is blocked when Trilogy Go Domain is empty
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Tenant Name: QA_TGO_Onb_<yyyyMMddHHmm>; Tenant Description: QA onboarding workflow test; Trilogy Go Domain: <blank>

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Fill Tenant Name and Description, leave Trilogy Go Domain empty |  |
| 5 | Click 'Save & Next' | Required-field validation is shown on Trilogy Go Domain; user stays on Tenant Information; no tenant is created. |

### TC-010 - TGO - Tenant Information - Invalid Trilogy Go Domain Formats
- **Req:** REQ-008 | **Type:** Negative | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 2 | **Severity:** Medium | **Risk:** Medium | **Automation:** High
- **Test Condition:** Trilogy Go Domain rejects malformed values with the same rules as the existing form
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Trilogy Go Domain values: (a) 'trilogy go qa01' (spaces) (b) 'trilogy-go-qa01..purplecheckpoint.com' (c) 'ftp://trilogy-go-qa01.purplecheckpoint.com' (d) 'https://trilogy-go-qa01.purplecheckpoint.com/' (protocol + trailing slash)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Enter a valid Tenant Name and Description |  |
| 5 | Enter value (a) in Trilogy Go Domain and click 'Save & Next' |  |
| 6 | Repeat step 5 for values (b), (c) and (d) | Values (a)-(c) are rejected with a format validation message and no tenant is created; value (d) is either normalised to the bare domain or rejected exactly as the pre-deployment Add Tenant form did (record behaviour); no malformed domain is persisted. |

### TC-011 - TGO - Tenant Information - Tenant Name Length Boundaries
- **Req:** REQ-008 | **Type:** Boundary | **Level:** System | **Technique:** BVA | **Category:** Functional
- **Priority:** 3 | **Severity:** Medium | **Risk:** Medium | **Automation:** High
- **Test Condition:** Tenant Name accepts max length and rejects max+1
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab. Max length N of Tenant Name taken from the existing Add Tenant form / API contract.
- **Test Data:** Tenant Name lengths: 1, N-1, N, N+1 characters; other fields per Tenant Name: QA_TGO_Onb_<yyyyMMddHHmm>; Tenant Description: QA onboarding workflow test; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Enter a 1-character Tenant Name with valid other fields and click 'Save & Next' |  |
| 5 | Create another tenant with an N-character name |  |
| 6 | Try another tenant with an N+1-character name | Names of length 1 and N are saved as Pending tenants and shown untruncated in the Tenants list and workflow header; N+1 is blocked (maxlength or validation message) and not persisted. |

### TC-012 - TGO - Tenant Information - Whitespace Only And Padded Names
- **Req:** REQ-008, REQ-020 | **Type:** Boundary | **Level:** System | **Technique:** BVA | **Category:** Functional
- **Priority:** 3 | **Severity:** Medium | **Risk:** Medium | **Automation:** High
- **Test Condition:** Whitespace-only names are rejected and surrounding spaces are trimmed
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Tenant Name: '   ' (3 spaces); then '  QA_TGO_Pad_<yyyyMMddHHmm>  '

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Enter Tenant Name of only spaces with valid other fields and click 'Save & Next' |  |
| 5 | Change Tenant Name to the padded value and click 'Save & Next' |  |
| 6 | Open the Tenants list and search the name | Whitespace-only name is rejected as empty; padded name is saved trimmed ('QA_TGO_Pad_<...>') with status Pending. |

### TC-013 - TGO - Tenant Information - Tenant Description Optional And Long
- **Req:** REQ-008 | **Type:** Boundary | **Level:** System | **Technique:** BVA | **Category:** Functional
- **Priority:** 4 | **Severity:** Low | **Risk:** Low | **Automation:** High
- **Test Condition:** Tenant Description empty and long values behave per the existing form
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Tenant Description: <blank>; then 500+ character text with line breaks and special characters (& < > " ')

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Fill Tenant Name and Trilogy Go Domain, leave Tenant Description blank and click 'Save & Next' |  |
| 5 | Return to Tenant Information and enter the long description, click 'Save & Next' |  |
| 6 | Re-open Tenant Information | Blank description is accepted if optional in the existing form (else a required message is shown); the long description is saved up to the field limit (limit enforced, no silent truncation) and special characters display exactly as entered. |

### TC-014 - TGO - Duplicate Tenant - Existing Tenant Name Rejected
- **Req:** REQ-020, REQ-003 | **Type:** Negative | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 1 | **Severity:** High | **Risk:** Medium | **Automation:** High
- **Test Condition:** A tenant that already exists cannot be created again through the workflow
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab. At least one pre-existing Active tenant created before this deployment, with >=1 Site and a working Trilogy connection; its Tenant ID, Site list, Trilogy Base URL and status were recorded before deployment.
- **Test Data:** Tenant Name: <exact name of the existing Active tenant>; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Enter the existing tenant's name and a valid Trilogy Go Domain |  |
| 5 | Click 'Save & Next' |  |
| 6 | Open the Tenants list and filter by that name | A duplicate-tenant error is shown; user stays on Tenant Information; only the original tenant exists (no new Pending record) and the original tenant's status stays Active. |

### TC-015 - TGO - Duplicate Tenant - Case And Space Variants
- **Req:** REQ-020 | **Type:** Boundary | **Level:** System | **Technique:** Error Guessing | **Category:** Functional
- **Priority:** 3 | **Severity:** Medium | **Risk:** Medium | **Automation:** High
- **Test Condition:** Duplicate detection handles case and surrounding-space variants
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab. A tenant named QA_TGO_Dup_01 exists.
- **Test Data:** Tenant Names: 'qa_tgo_dup_01', 'QA_TGO_DUP_01', ' QA_TGO_Dup_01 '

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Enter 'qa_tgo_dup_01' with a valid Trilogy Go Domain and click 'Save & Next' |  |
| 5 | Repeat with 'QA_TGO_DUP_01' |  |
| 6 | Repeat with ' QA_TGO_Dup_01 ' | Each variant is treated consistently with the existing duplicate rule (rejected if names are case-insensitive unique); the padded variant is always rejected after trimming; no near-duplicate Pending tenants are created unintentionally (record the rule observed). |

### TC-016 - TGO - Security - XSS Payload In Tenant Fields
- **Req:** REQ-008 | **Type:** Negative | **Level:** System | **Technique:** Error Guessing | **Category:** Security
- **Priority:** 2 | **Severity:** High | **Risk:** Medium | **Automation:** High
- **Test Condition:** Script payloads in Tenant Name/Description are stored and rendered as text
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Tenant Name: QA_XSS_<yyyyMMddHHmm><img src=x onerror=alert(1)>; Tenant Description: <script>alert('tgo')</script>

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Enter the payloads from Test Data with a valid Trilogy Go Domain and click 'Save & Next' |  |
| 5 | Open the Tenants list |  |
| 6 | Re-open the tenant's Tenant Information tab | Either the input is rejected by validation or it is saved and rendered HTML-encoded as literal text in the list, workflow header and form; no script executes and no alert dialog appears. |

### TC-017 - TGO - Security - SQL Injection String In Tenant Name
- **Req:** REQ-008 | **Type:** Negative | **Level:** Integration | **Technique:** Error Guessing | **Category:** Security
- **Priority:** 3 | **Severity:** High | **Risk:** Medium | **Automation:** High
- **Test Condition:** SQL/NoSQL meta characters are treated as literal data
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Tenant Name: QA_SQLi' OR '1'='1; Tenant Description: {"$gt":""}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Enter the Test Data values with a valid Trilogy Go Domain and click 'Save & Next' |  |
| 5 | Open the Tenants list and search for 'QA_SQLi' | Request is rejected by validation or saved as literal text; no server error (500), no extra/other tenants exposed in the list and existing tenants are unchanged. |

### TC-018 - TGO - AC2 - Save And Next Saves Tenant And Advances
- **Req:** REQ-002, REQ-001 | **Type:** Positive | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 1 | **Severity:** Critical | **Risk:** High | **Automation:** High
- **Test Condition:** Valid Tenant Information is saved and the workflow advances to Regions/Sites
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Tenant Name: QA_TGO_Onb_<yyyyMMddHHmm>; Tenant Description: QA onboarding workflow test; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Enter Tenant Name, Tenant Description and Trilogy Go Domain from Test Data |  |
| 5 | Click 'Save & Next' |  |
| 6 | Open the Tenants list in a new browser tab and search the Tenant Name | Success feedback is shown, the Regions/Sites tab becomes active, and the tenant appears exactly once in the Tenants list with the entered Name, Description and Trilogy Go Domain. |

### TC-019 - TGO - AC2 - Rapid Double Click On Save And Next
- **Req:** REQ-002 | **Type:** Negative | **Level:** System | **Technique:** Error Guessing | **Category:** Functional
- **Priority:** 2 | **Severity:** High | **Risk:** High | **Automation:** High
- **Test Condition:** Multiple rapid Save & Next clicks create only one tenant
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Tenant Name: QA_TGO_Onb_<yyyyMMddHHmm>; Tenant Description: QA onboarding workflow test; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Enter Tenant Name, Tenant Description and Trilogy Go Domain from Test Data |  |
| 5 | Double/triple-click 'Save & Next' rapidly |  |
| 6 | Open the Tenants list and search the Tenant Name | Button is disabled/ignored while saving; exactly one Pending tenant exists; no duplicate-name error or 500 is displayed to the user. |

### TC-020 - TGO - AC2 - Save And Next Fails On Server Or Network Error
- **Req:** REQ-002, REQ-011 | **Type:** Negative | **Level:** Integration | **Technique:** Error Guessing | **Category:** Recovery
- **Priority:** 2 | **Severity:** High | **Risk:** High | **Automation:** Medium
- **Test Condition:** A failed save keeps the user on the step with data retained and creates no partial tenant
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab. Browser DevTools available to set 'Offline' or block the tenant save request (ref. Bug 1476792 - 500 on Create Tenant).
- **Test Data:** Tenant Name: QA_TGO_Onb_<yyyyMMddHHmm>; Tenant Description: QA onboarding workflow test; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Enter Tenant Name, Tenant Description and Trilogy Go Domain from Test Data |  |
| 5 | In DevTools set Network to Offline (or block the save request) |  |
| 6 | Click 'Save & Next' |  |
| 7 | Restore the network and click 'Save & Next' again |  |
| 8 | Open the Tenants list and search the Tenant Name | On failure a clear error is shown, the user stays on Tenant Information and entered values are retained; after retry the tenant is saved once as Pending and the workflow advances; no orphan/partial tenant exists from the failed attempt. |

### TC-021 - TGO - AC2 - Back To Tenant Information Edit And Save Again
- **Req:** REQ-002, REQ-001 | **Type:** Positive | **Level:** System | **Technique:** State Transition | **Category:** Functional
- **Priority:** 2 | **Severity:** High | **Risk:** High | **Automation:** High
- **Test Condition:** Re-saving a completed step updates the same tenant
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Tenant Name: QA_TGO_Onb_<yyyyMMddHHmm>; Tenant Description: QA onboarding workflow test; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com; updated Tenant Description: QA onboarding workflow test - updated

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Enter Tenant Name, Tenant Description and Trilogy Go Domain from Test Data and click 'Save & Next' |  |
| 5 | Click the 'Tenant Information' tab |  |
| 6 | Verify saved values are prefilled, change Tenant Description to the updated value |  |
| 7 | Click 'Save & Next' |  |
| 8 | Open the Tenants list and search the Tenant Name | Saved values are prefilled on return; the update is saved to the same tenant (same Tenant ID); exactly one tenant exists with the updated description and status Pending; workflow is on Regions/Sites. |

### TC-022 - TGO - Navigation - Leave Workflow With Unsaved Changes
- **Req:** REQ-002, REQ-005 | **Type:** Negative | **Level:** System | **Technique:** Error Guessing | **Category:** Usability
- **Priority:** 3 | **Severity:** Medium | **Risk:** Medium | **Automation:** Medium
- **Test Condition:** Leaving with unsaved changes warns the user and the prompt is responsive
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab. (ref. Bug 1459456 - unresponsive Leave/Stay popup on Manage Service End Point).
- **Test Data:** Tenant Name: QA_TGO_Onb_<yyyyMMddHHmm>; Tenant Description: QA onboarding workflow test; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Enter Tenant Name, Tenant Description and Trilogy Go Domain from Test Data without saving |  |
| 5 | Click another side-menu item (e.g. Sites or Activity Report) |  |
| 6 | If a Leave/Stay prompt appears click 'Stay' |  |
| 7 | Click the menu item again and choose 'Leave' | A leave/stay confirmation (if implemented per Trilogy pattern) is shown and both buttons respond; 'Stay' keeps entered data; 'Leave' navigates away and no tenant is created from the unsaved data. If no prompt exists, unsaved data is discarded and no tenant is created (record behaviour). |

### TC-023 - TGO - AC3 - New Tenant Saved With Pending Status
- **Req:** REQ-003 | **Type:** Positive | **Level:** System | **Technique:** State Transition | **Category:** Functional
- **Priority:** 1 | **Severity:** Critical | **Risk:** High | **Automation:** High
- **Test Condition:** First save of a new tenant sets status Pending
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Tenant Name: QA_TGO_Onb_<yyyyMMddHHmm>; Tenant Description: QA onboarding workflow test; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Enter Tenant Name, Tenant Description and Trilogy Go Domain from Test Data and click 'Save & Next' |  |
| 5 | Navigate to the Tenants list |  |
| 6 | Locate the new tenant and read its Status |  |
| 7 | Refresh the page and read the Status again | The new tenant shows Status = Pending (not Active) before and after refresh. |

### TC-024 - TGO - AC3 - Pending Tenant Not Active Immediately
- **Req:** REQ-003, REQ-009 | **Type:** Negative | **Level:** System | **Technique:** State Transition | **Category:** Functional
- **Priority:** 1 | **Severity:** High | **Risk:** High | **Automation:** High
- **Test Condition:** A Pending tenant is not treated as Active anywhere in TGO
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants (list).
- **Test Data:** Pending tenant from Preconditions

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' and filter/sort by Status if available |  |
| 3 | Open the Pending tenant and check the header/status badge |  |
| 4 | Check any Active-only views/filters (e.g. Active filter, tenant selectors) | The tenant is listed only as Pending, is excluded from Active-only filters/counts, and no action or view shows it as Active. |

### TC-025 - TGO - AC3 - Pending Status Persisted In Backend
- **Req:** REQ-003 | **Type:** Positive | **Level:** Integration | **Technique:** EP | **Category:** Database
- **Priority:** 2 | **Severity:** High | **Risk:** High | **Automation:** Medium
- **Test Condition:** Tenant lifecycle state Pending is stored for the new tenant record
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Read access to the TGO tenant store (lifecycle state field from US 1411909) or the tenant GET API via DevTools.
- **Test Data:** Tenant ID of the Pending tenant

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Open DevTools Network tab and open the Pending tenant in the Tenants list |  |
| 2 | Inspect the tenant GET response |  |
| 3 | Query the tenant record in the TGO tenant store by Tenant ID | API response and stored record both show lifecycle state Pending (not Active/null); Name, Description and Trilogy Go Domain match the UI entries. |

### TC-026 - TGO - AC4 - Complete Onboarding Multiple Regions Becomes Active
- **Req:** REQ-004, REQ-009, REQ-007 | **Type:** Positive | **Level:** System | **Technique:** State Transition | **Category:** Functional
- **Priority:** 1 | **Severity:** Critical | **Risk:** High | **Automation:** High
- **Test Condition:** Completing all steps with several Regions/Sites transitions the tenant to Active
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** Region Name: QA_Region_East; Trilogy Base URL: loyalty-atm-a02.purplecheckpoint.com; Region Description: QA east region; Region 2: QA_Region_West / loyalty-atm-a02.purplecheckpoint.com; Sites QA_Site_01 (East), QA_Site_02 (West)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | On Regions/Sites click 'Add Region' and save QA_Region_East |  |
| 5 | Add Region QA_Region_West |  |
| 6 | Add Site QA_Site_01 under QA_Region_East and QA_Site_02 under QA_Region_West |  |
| 7 | Click the final completion action ('Save & Next' / Finish / Complete) |  |
| 8 | Open the Tenants list and read the Status | Onboarding completes with a success message; the tenant status changes from Pending to Active and both Regions with their Sites are shown in the hierarchy. |

### TC-027 - TGO - AC4 - Minimum One Region One Site Activates Tenant
- **Req:** REQ-004, REQ-009 | **Type:** Boundary | **Level:** System | **Technique:** BVA | **Category:** Functional
- **Priority:** 1 | **Severity:** High | **Risk:** High | **Automation:** High
- **Test Condition:** The minimum Region/Site configuration activates the tenant
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab. Assumption A1 (>=1 Region with >=1 Site).
- **Test Data:** Region Name: QA_Region_East; Trilogy Base URL: loyalty-atm-a02.purplecheckpoint.com; Region Description: QA east region; Site: QA_Site_01 with the existing mandatory Site fields populated per the current Site form

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | Add one Region from Test Data |  |
| 5 | Add one Site under that Region |  |
| 6 | Click the final completion action |  |
| 7 | Open the Tenants list and read the Status | With exactly one Region and one Site the tenant becomes Active (if the build requires more, record the actual minimum and raise against REQ-004 ambiguity). |

### TC-028 - TGO - AC4 - No Region Keeps Tenant Pending
- **Req:** REQ-009, REQ-004, REQ-010 | **Type:** Negative | **Level:** System | **Technique:** Decision Table | **Category:** Functional
- **Priority:** 1 | **Severity:** High | **Risk:** High | **Automation:** High
- **Test Condition:** Tenant Information only (no Region) cannot activate the tenant
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** Decision rule: Tenant Info = Y, Region = N, Site = N

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | On Regions/Sites (no Regions) click the final completion action if enabled |  |
| 5 | Open the Tenants list and read the Status | Completion is disabled or blocked with a message that at least one Region/Site is required; status remains Pending. |

### TC-029 - TGO - AC4 - Region Without Site Keeps Tenant Pending
- **Req:** REQ-009, REQ-004 | **Type:** Negative | **Level:** System | **Technique:** Decision Table | **Category:** Functional
- **Priority:** 1 | **Severity:** High | **Risk:** High | **Automation:** High
- **Test Condition:** A Region without any Site does not satisfy onboarding requirements
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** Decision rule: Tenant Info = Y, Region = Y, Site = N; Region Name: QA_Region_East; Trilogy Base URL: loyalty-atm-a02.purplecheckpoint.com; Region Description: QA east region

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | Add one Region from Test Data and do not add any Site |  |
| 5 | Click the final completion action if enabled |  |
| 6 | Open the Tenants list and read the Status | Completion is blocked with a Site-required message and status remains Pending (if the build activates here, log as discrepancy vs assumption A1 for PO confirmation). |

### TC-030 - TGO - Lifecycle - Active Tenant Loses Last Site
- **Req:** REQ-004, REQ-009 | **Type:** Negative | **Level:** System | **Technique:** Exploratory | **Category:** Functional
- **Priority:** 3 | **Severity:** Medium | **Risk:** Medium | **Automation:** Low
- **Test Condition:** Status behaviour when an Active tenant's only Site is soft-deleted is defined and consistent
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A tenant activated through the new workflow with exactly one Region and one Site. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** Tenant from TC activating with minimum config

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | On Regions/Sites delete the only Site (soft delete) and confirm |  |
| 5 | Open the Tenants list and read the Status |  |
| 6 | Try deleting the Region | Behaviour is consistent and recorded: the tenant either stays Active or reverts to Pending as per PO decision (Missing Requirement); Region deletion is allowed only when no Sites remain (US 1411893); no error/500 occurs. |

### TC-031 - TGO - Bypass - Status Cannot Be Set Manually
- **Req:** REQ-010, REQ-009 | **Type:** Negative | **Level:** System | **Technique:** State Transition | **Category:** Security
- **Priority:** 1 | **Severity:** High | **Risk:** High | **Automation:** High
- **Test Condition:** Pending status cannot be changed to Active via editable controls
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Pending tenant from Preconditions

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | On Tenant Information and on the tenant list row look for any Status field/toggle/action |  |
| 5 | If any status control exists attempt to set it to Active and save | Status is read-only (no control) or the change is rejected; tenant remains Pending. |

### TC-032 - TGO - Bypass - Direct API Activation Of Incomplete Tenant
- **Req:** REQ-010, REQ-009 | **Type:** Negative | **Level:** Integration | **Technique:** Error Guessing | **Category:** API
- **Priority:** 1 | **Severity:** Critical | **Risk:** High | **Automation:** High
- **Test Condition:** Backend rejects activation of a tenant with incomplete onboarding
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Tenant update/onboarding-state API request captured from DevTools while saving Tenant Information (endpoint not documented in intake).
- **Test Data:** Captured request with lifecycle/status value changed to Active

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Replay the captured tenant update/onboarding-state request with status/state = Active using Postman and the same auth token |  |
| 2 | Send the request |  |
| 3 | Open the Tenants list and read the Status | API returns a 4xx validation/forbidden error (not 200, not 500); tenant remains Pending. |

### TC-033 - TGO - Bypass - Deep Link To Regions Sites Step
- **Req:** REQ-010 | **Type:** Negative | **Level:** System | **Technique:** Error Guessing | **Category:** Security
- **Priority:** 2 | **Severity:** High | **Risk:** High | **Automation:** High
- **Test Condition:** Direct URL to a later step cannot skip required steps or expose other data
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Regions/Sites URL of the Pending tenant copied from the address bar.
- **Test Data:** Copied Regions/Sites URL; same URL with a non-existent tenant ID; same URL with no tenant ID

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Open a new Add Tenant workflow and, without saving, paste the Regions/Sites URL pattern with no tenant ID |  |
| 2 | Paste the URL with a non-existent tenant ID |  |
| 3 | Paste the valid Pending tenant URL | No-ID and invalid-ID URLs redirect to Tenant Information or show a not-found message without creating data or errors; the valid URL opens the Pending tenant's Regions/Sites step normally. |

### TC-034 - TGO - Navigation - Browser Back After Save And Next
- **Req:** REQ-002, REQ-010 | **Type:** Negative | **Level:** System | **Technique:** Error Guessing | **Category:** Functional
- **Priority:** 3 | **Severity:** Medium | **Risk:** Medium | **Automation:** High
- **Test Condition:** Browser back/forward does not resubmit or duplicate the tenant
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Tenant Name: QA_TGO_Onb_<yyyyMMddHHmm>; Tenant Description: QA onboarding workflow test; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Click the '+' (Add Tenant) icon |  |
| 4 | Enter Tenant Name, Tenant Description and Trilogy Go Domain from Test Data and click 'Save & Next' |  |
| 5 | Press the browser Back button |  |
| 6 | Click 'Save & Next' on the shown form |  |
| 7 | Press Forward, then open the Tenants list | Back shows the saved tenant data (not a blank new-tenant form that creates a second record); re-saving updates the same tenant; exactly one Pending tenant exists. |

### TC-035 - TGO - AC5 - Resume Pending Tenant At Next Step
- **Req:** REQ-005 | **Type:** Positive | **Level:** System | **Technique:** State Transition | **Category:** Functional
- **Priority:** 1 | **Severity:** Critical | **Risk:** High | **Automation:** High
- **Test Condition:** A Pending tenant reopens at the next incomplete step with saved data prefilled
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants (list).
- **Test Data:** Pending tenant from Preconditions

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' and navigate to another menu (e.g. Activity Report), then back to 'Tenants' |  |
| 3 | Open the Pending tenant (Edit / Continue Onboarding) |  |
| 4 | Click the 'Tenant Information' tab | Workflow opens on the next incomplete step (Regions/Sites); Tenant Information shows the saved Name, Description and Trilogy Go Domain; status still Pending. |

### TC-036 - TGO - AC5 - Progress Persists Across Logout And Browser
- **Req:** REQ-011, REQ-005 | **Type:** Positive | **Level:** System | **Technique:** State Transition | **Category:** Functional
- **Priority:** 1 | **Severity:** High | **Risk:** High | **Automation:** High
- **Test Condition:** Onboarding progress persists across sessions and browsers
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab. Chrome and Edge available.
- **Test Data:** Region Name: QA_Region_East; Trilogy Base URL: loyalty-atm-a02.purplecheckpoint.com; Region Description: QA east region

| # | Step Action | Expected Result |
|---|---|---|
| 1 | In Chrome log in to https://trilogy-go-qa01.purplecheckpoint.com/tgo, click 'Tenants' and open the Pending tenant |  |
| 2 | Add a Region from Test Data (no Site) |  |
| 3 | Log out and close the browser |  |
| 4 | In Edge log in to /tgo and open the same tenant from 'Tenants' | In the new session/browser the tenant is Pending, opens on Regions/Sites and shows the saved Region; Tenant Information values are intact (server-side persistence, not local storage). |

### TC-037 - TGO - AC5 - Pending Tenants Identifiable In Tenants List
- **Req:** REQ-005, REQ-003 | **Type:** Positive | **Level:** UAT | **Technique:** EP | **Category:** Usability
- **Priority:** 2 | **Severity:** Medium | **Risk:** Medium | **Automation:** High
- **Test Condition:** Users can find Pending tenants and an action to continue onboarding
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. At least one pre-existing Active tenant created before this deployment, with >=1 Site and a working Trilogy connection; its Tenant ID, Site list, Trilogy Base URL and status were recorded before deployment. Breadcrumb: TGO Dashboard (/tgo) > Tenants (list).
- **Test Data:** One Pending and one Active tenant

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to /tgo and click 'Tenants' |  |
| 2 | Compare the Pending and Active rows (status column/badge, row actions) |  |
| 3 | Use search/filter/sort on status if available | Pending and Active tenants are clearly distinguished by status; the Pending row offers an action to continue onboarding; filter/sort by status (if present) returns correct rows. |

### TC-038 - TGO - AC5 - Session Timeout During Regions Step
- **Req:** REQ-011 | **Type:** Negative | **Level:** System | **Technique:** Error Guessing | **Category:** Recovery
- **Priority:** 2 | **Severity:** Medium | **Risk:** High | **Automation:** Low
- **Test Condition:** Session expiry mid-step keeps saved data and loses only unsaved input
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab. Ability to expire the session (wait for timeout or delete the auth cookie/token in DevTools).
- **Test Data:** Region Name: QA_Region_East; Trilogy Base URL: loyalty-atm-a02.purplecheckpoint.com; Region Description: QA east region

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | Click 'Add Region' and fill the modal without saving |  |
| 5 | Expire the session |  |
| 6 | Click Save in the modal |  |
| 7 | Log in again and open the tenant | User is sent to login (or shown a session-expired message) without a 500; after re-login the tenant is Pending with previously saved data intact; the unsaved Region is absent or saved once - never duplicated or partially saved. |

### TC-039 - TGO - Concurrency - Two Admins Onboard Same Tenant
- **Req:** REQ-011, REQ-004 | **Type:** Negative | **Level:** System | **Technique:** Error Guessing | **Category:** Functional
- **Priority:** 2 | **Severity:** High | **Risk:** High | **Automation:** Low
- **Test Condition:** Concurrent edits on one Pending tenant do not lose data or double-activate
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). Two Admin users (A in Chrome, B in Edge). A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** A adds QA_Region_East; B adds QA_Region_West + QA_Site_02

| # | Step Action | Expected Result |
|---|---|---|
| 1 | User A and User B both open the same Pending tenant on Regions/Sites |  |
| 2 | User A adds QA_Region_East |  |
| 3 | User B (without refresh) adds QA_Region_West with QA_Site_02 and completes onboarding |  |
| 4 | Both users refresh | Both Regions exist (no lost update) and the tenant is Active exactly once; stale screens refresh or show a conflict message instead of overwriting data. |

### TC-040 - TGO - Browser Refresh Mid Workflow Keeps Step
- **Req:** REQ-011, REQ-005 | **Type:** Positive | **Level:** System | **Technique:** State Transition | **Category:** Recovery
- **Priority:** 2 | **Severity:** Medium | **Risk:** Medium | **Automation:** High
- **Test Condition:** Refreshing the page keeps the current step and saved data
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** Region Name: QA_Region_East; Trilogy Base URL: loyalty-atm-a02.purplecheckpoint.com; Region Description: QA east region

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | Add a Region from Test Data |  |
| 5 | Press F5 on the Regions/Sites tab | After reload the same tenant is shown on Regions/Sites with the saved Region; no redirect to a blank new-tenant form; status Pending. |

### TC-041 - TGO - AC7 - Regions Sites Empty State With Add Region
- **Req:** REQ-017, REQ-007 | **Type:** Positive | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 2 | **Severity:** Medium | **Risk:** Medium | **Automation:** High
- **Test Condition:** New tenant Regions/Sites step shows empty state and Add Region
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** Pending tenant without Regions

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | Observe the Regions/Sites tab content | An empty-state message indicating no Regions exist is displayed with an 'Add Region' action; no Sites of other tenants are listed. |

### TC-042 - TGO - AC7 - Add Region Within Onboarding
- **Req:** REQ-007, REQ-017 | **Type:** Positive | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 1 | **Severity:** High | **Risk:** Medium | **Automation:** High
- **Test Condition:** A Region can be created from the onboarding Regions/Sites step
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** Region Name: QA_Region_East; Trilogy Base URL: loyalty-atm-a02.purplecheckpoint.com; Region Description: QA east region

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | Click 'Add Region' |  |
| 5 | Verify the modal fields and fill Region Name, Trilogy Base URL and Region Description from Test Data |  |
| 6 | Click Save in the modal | Modal (Offer Maker pattern) shows Region Name, Trilogy Base URL and Region Description; on save the Region appears as a parent row in the nested grid of this tenant; tenant stays Pending. |

### TC-043 - TGO - AC7 - Add Site Under Region And Expand Collapse
- **Req:** REQ-007, REQ-015, REQ-017 | **Type:** Positive | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 1 | **Severity:** High | **Risk:** Medium | **Automation:** High
- **Test Condition:** A Site can be added under a Region and the hierarchy expands/collapses
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Pending tenant with Region QA_Region_East and no Sites. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** Site: QA_Site_01 with the existing mandatory Site fields populated per the current Site form

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | Click the inline 'Add Site' action on QA_Region_East |  |
| 5 | Fill the Site fields from Test Data and save |  |
| 6 | Collapse and expand QA_Region_East | Site is shown as a child row under QA_Region_East; collapse hides it and expand shows it again; existing Site fields are available in the Site modal. |

### TC-044 - TGO - Region Site Rule - Site Cannot Be Created Without Region
- **Req:** REQ-015 | **Type:** Negative | **Level:** System | **Technique:** Decision Table | **Category:** Functional
- **Priority:** 1 | **Severity:** High | **Risk:** High | **Automation:** High
- **Test Condition:** Site creation requires a Region (no orphan Sites)
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** Pending tenant with no Regions

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | Look for any Add Site action on the empty Regions/Sites step |  |
| 5 | If a Site modal can be opened try to save a Site without selecting a Region | No Add Site action is available without a Region, or saving is blocked with a 'Region is required' message; no Site record is created. |

### TC-045 - TGO - Region Site Rule - Orphan Site Via API Rejected
- **Req:** REQ-015, REQ-010 | **Type:** Negative | **Level:** Integration | **Technique:** Error Guessing | **Category:** API
- **Priority:** 2 | **Severity:** High | **Risk:** High | **Automation:** High
- **Test Condition:** Backend rejects Site creation without a valid Region for the tenant
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Pending tenant with one Region; Site create request captured from DevTools.
- **Test Data:** Captured Site create payload with Region reference removed; then with a Region ID belonging to another tenant

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Replay the Site create request without Region reference |  |
| 2 | Replay it with another tenant's Region ID |  |
| 3 | Reload the tenant's Regions/Sites step | Both requests are rejected with 4xx validation errors; no orphan or cross-tenant Site appears in either tenant's hierarchy. |

### TC-046 - TGO - Region Rule - Duplicate Region Name In Same Tenant
- **Req:** REQ-016 | **Type:** Negative | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 2 | **Severity:** Medium | **Risk:** Medium | **Automation:** High
- **Test Condition:** Region names are unique within a tenant during onboarding
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Pending tenant with Region QA_Region_East. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** Region Name: QA_Region_East; Trilogy Base URL: loyalty-atm-a02.purplecheckpoint.com

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | Click 'Add Region' and enter the duplicate Region Name |  |
| 5 | Click Save | Duplicate Region name validation message is shown; modal stays open; only one QA_Region_East exists. |

### TC-047 - TGO - Region Rule - Same Region Name In Different Tenant Allowed
- **Req:** REQ-016 | **Type:** Positive | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 3 | **Severity:** Medium | **Risk:** Medium | **Automation:** High
- **Test Condition:** Region uniqueness is scoped per tenant
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Tenant X has Region QA_Region_East; Tenant Y is Pending without Regions. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** Region Name: QA_Region_East for Tenant Y

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Open Tenant Y onboarding Regions/Sites step |  |
| 2 | Add Region QA_Region_East with a valid Trilogy Base URL |  |
| 3 | Open Tenant X hierarchy | Region is created for Tenant Y; Tenant X's Region is unchanged and each tenant shows only its own Region. |

### TC-048 - TGO - Region Rule - Duplicate Name Case And Space Variants
- **Req:** REQ-016 | **Type:** Boundary | **Level:** System | **Technique:** BVA | **Category:** Functional
- **Priority:** 3 | **Severity:** Low | **Risk:** Medium | **Automation:** High
- **Test Condition:** Region duplicate check handles case and trailing spaces
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Pending tenant with Region QA_Region_East. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** Region Names: 'qa_region_east', 'QA_Region_East ' (trailing space)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | Add Region 'qa_region_east' and save |  |
| 5 | Add Region 'QA_Region_East ' and save | Trailing-space variant is rejected as duplicate after trimming; case variant follows the documented rule consistently with backend validation (record rule); no two visually identical Regions exist. |

### TC-049 - TGO - Region Modal - Required Fields Validation
- **Req:** REQ-017, REQ-009 | **Type:** Negative | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 2 | **Severity:** Medium | **Risk:** Medium | **Automation:** High
- **Test Condition:** Region cannot be saved without Region Name or Trilogy Base URL
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** (a) Region Name blank; (b) Trilogy Base URL blank; (c) Trilogy Base URL 'not a url'

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to https://trilogy-go-qa01.purplecheckpoint.com/tgo and log in |  |
| 2 | Click 'Tenants' in the side menu |  |
| 3 | Locate the tenant from Preconditions and open it (Edit / Continue Onboarding action) |  |
| 4 | Click 'Add Region' and try to save variant (a) |  |
| 5 | Try to save variant (b) |  |
| 6 | Try to save variant (c) | Each variant shows field-level validation; no Region is created; tenant remains Pending. |

### TC-050 - TGO - AC7 Navigation Refactor - Region Site Not Disconnected
- **Req:** REQ-012, REQ-007 | **Type:** Positive | **Level:** UAT | **Technique:** Exploratory | **Category:** Usability
- **Priority:** 2 | **Severity:** Medium | **Risk:** Medium | **Automation:** Medium
- **Test Condition:** Region/Site management is reached via the tenant, not a disconnected page
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. At least one pre-existing Active tenant created before this deployment, with >=1 Site and a working Trilogy connection; its Tenant ID, Site list, Trilogy Base URL and status were recorded before deployment. Breadcrumb: TGO Dashboard (/tgo) > Tenants (list).
- **Test Data:** Existing tenant with Sites

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to /tgo and review the side menu for standalone Region/Site pages |  |
| 2 | Open the existing tenant from 'Tenants' |  |
| 3 | Open its Regions/Sites tab |  |
| 4 | If a standalone Sites page still exists, open it and compare the data for the same tenant | Regions and Sites of the tenant are managed from the tenant's Regions/Sites tab; any remaining standalone page shows the same hierarchy/data (no conflicting or disconnected lists). |

### TC-051 - TGO - Edit Existing Tenant - Non Wizard Tab Navigation
- **Req:** REQ-001, REQ-007, REQ-006 | **Type:** Positive | **Level:** System | **Technique:** State Transition | **Category:** Functional
- **Priority:** 2 | **Severity:** Medium | **Risk:** Medium | **Automation:** High
- **Test Condition:** Existing tenant edit allows free tab navigation with Region/Site access
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. At least one pre-existing Active tenant created before this deployment, with >=1 Site and a working Trilogy connection; its Tenant ID, Site list, Trilogy Base URL and status were recorded before deployment. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab. Assumption A3 (Task 1488342 'Non Wizard Mode creation for update tenant').
- **Test Data:** Existing Active tenant

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to /tgo and click 'Tenants' |  |
| 2 | Open the existing Active tenant (Edit) |  |
| 3 | Click the 'Regions/Sites' tab directly |  |
| 4 | Click back to 'Tenant Information' | Both tabs are freely accessible for the existing tenant without forcing Save & Next; the migrated Regions/Sites are shown; status stays Active. |

### TC-052 - TGO - AC6 - Existing Active Tenant Remains Active
- **Req:** REQ-006, REQ-018 | **Type:** Positive | **Level:** System | **Technique:** EP | **Category:** Functional
- **Priority:** 1 | **Severity:** Critical | **Risk:** High | **Automation:** High
- **Test Condition:** Pre-existing Active tenants keep Active status after deployment
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. At least one pre-existing Active tenant created before this deployment, with >=1 Site and a working Trilogy connection; its Tenant ID, Site list, Trilogy Base URL and status were recorded before deployment. Breadcrumb: TGO Dashboard (/tgo) > Tenants (list).
- **Test Data:** Pre-deployment snapshot of existing tenants (ID, Name, Status)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Navigate to /tgo and click 'Tenants' |  |
| 2 | Compare every tenant in the pre-deployment snapshot with the list | Every pre-existing tenant is present with the same Name and Tenant ID and Status Active; none is Pending. |

### TC-053 - TGO - AC6 - Existing Tenant Sites Migrated Under Regions
- **Req:** REQ-018, REQ-006, REQ-015 | **Type:** Positive | **Level:** Integration | **Technique:** EP | **Category:** Functional
- **Priority:** 1 | **Severity:** High | **Risk:** High | **Automation:** Medium
- **Test Condition:** Existing Sites and Trilogy Base URLs are preserved under Regions with no orphans
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. At least one pre-existing Active tenant created before this deployment, with >=1 Site and a working Trilogy connection; its Tenant ID, Site list, Trilogy Base URL and status were recorded before deployment. Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** Pre-deployment Site list and Trilogy Base URL of the existing tenant

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Open the existing tenant from 'Tenants' |  |
| 2 | Open the 'Regions/Sites' tab and expand all Regions |  |
| 3 | Compare Sites and each Region's Trilogy Base URL with the pre-deployment snapshot | All pre-existing Sites appear under a Region (none missing/orphaned) and the Region's Trilogy Base URL equals the previous Site-level Trilogy Base URL. |

### TC-054 - TGO - AC6 - Existing Tenant Connectivity And TGO Settings Work
- **Req:** REQ-006, REQ-022 | **Type:** Positive | **Level:** Integration | **Technique:** EP | **Category:** Functional
- **Priority:** 1 | **Severity:** Critical | **Risk:** High | **Automation:** Low
- **Test Condition:** Existing tenant connector configuration keeps working after deployment
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). At least one pre-existing Active tenant created before this deployment, with >=1 Site and a working Trilogy connection; its Tenant ID, Site list, Trilogy Base URL and status were recorded before deployment. Access to the tenant's Trilogy instance (System > Tenant) and TGO Settings under Admin Configuration.
- **Test Data:** Existing tenant Trilogy Domain / Trilogy Go Domain

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Log in to the tenant's Trilogy instance and go to System > Tenant |  |
| 2 | Search with the Trilogy Domain and Trilogy Go Domain and click 'Check Connectivity' |  |
| 3 | In TGO open Admin Configuration > TGO Settings for one of the tenant's Sites | Connectivity check is successful and TGO Settings for the Site load with the pre-deployment values. |

### TC-055 - TGO - AC6 - Existing Tenant Traffic In Service Activity Report
- **Req:** REQ-006 | **Type:** Positive | **Level:** Integration | **Technique:** EP | **Category:** API
- **Priority:** 2 | **Severity:** High | **Risk:** High | **Automation:** Medium
- **Test Condition:** Existing tenant API traffic continues after deployment
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. At least one pre-existing Active tenant created before this deployment, with >=1 Site and a working Trilogy connection; its Tenant ID, Site list, Trilogy Base URL and status were recorded before deployment. Mobile app/kiosk configured for the existing tenant. Breadcrumb: TGO Dashboard (/tgo) > Activity Report.
- **Test Data:** Existing tenant ID and Site ID

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Perform a player action from the tenant's mobile app (e.g. open content/offers) |  |
| 2 | In TGO open Activity Report, select the tenant ID and site ID |  |
| 3 | Open the latest request trace | Requests after deployment are listed for the tenant/site with successful (2xx) responses; no tenant-not-active/unauthorized errors. |

### TC-056 - TGO - AC6 - Editing Existing Tenant Does Not Reset To Pending
- **Req:** REQ-006, REQ-003 | **Type:** Negative | **Level:** System | **Technique:** State Transition | **Category:** Functional
- **Priority:** 1 | **Severity:** High | **Risk:** High | **Automation:** High
- **Test Condition:** Saving an existing Active tenant keeps it Active
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. At least one pre-existing Active tenant created before this deployment, with >=1 Site and a working Trilogy connection; its Tenant ID, Site list, Trilogy Base URL and status were recorded before deployment. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab.
- **Test Data:** Tenant Description: <original> + ' - edited by QA'

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Open the existing Active tenant from 'Tenants' |  |
| 2 | Change Tenant Description and click 'Save & Next' (or Save) |  |
| 3 | Open the Tenants list and read the Status | Change is saved and the tenant remains Active (not reset to Pending); Regions/Sites unchanged. |

### TC-057 - TGO - AC6 - Migrated Data Lifecycle And Region Integrity
- **Req:** REQ-018, REQ-006 | **Type:** Positive | **Level:** Integration | **Technique:** EP | **Category:** Database
- **Priority:** 2 | **Severity:** High | **Risk:** High | **Automation:** Medium
- **Test Condition:** Backend records of existing tenants have Active state and valid Region references
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). Read access to the TGO tenant/region/site store. At least one pre-existing Active tenant created before this deployment, with >=1 Site and a working Trilogy connection; its Tenant ID, Site list, Trilogy Base URL and status were recorded before deployment.
- **Test Data:** All tenant, region and site records existing before deployment

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Query all tenant records created before the deployment date |  |
| 2 | Query all site records and their Region reference |  |
| 3 | Query Regions and their Tenant reference | All pre-existing tenants have lifecycle state Active (none null/Pending); every Site references an existing, non-deleted Region of the same tenant; no orphan Sites or Regions. |

### TC-058 - TGO - Trilogy Onboarding - Pending Tenant Search Behaviour
- **Req:** REQ-022, REQ-009 | **Type:** Negative | **Level:** Integration | **Technique:** Exploratory | **Category:** Functional
- **Priority:** 2 | **Severity:** High | **Risk:** High | **Automation:** Not Feasible
- **Test Condition:** Pending tenant handling in Trilogy platform onboarding is defined and does not activate the TGO tenant
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Trilogy instance with machine IP registered in TGO IP Restrictions (wiki).
- **Test Data:** Trilogy Domain: loyalty-atm-a02.purplecheckpoint.com; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Log in to Trilogy, select All Properties, go to System > Tenant |  |
| 2 | Search with the Trilogy Domain and Trilogy Go Domain |  |
| 3 | Note whether the Pending tenant is listed and whether 'Onboard' is allowed |  |
| 4 | In TGO read the tenant status | Behaviour is recorded for PO decision (listed/not listed, onboard allowed/blocked); in all cases the TGO tenant stays Pending until the TGO workflow is completed. |

### TC-059 - TGO - Trilogy Onboarding - Completed Tenant Onboards And Connects
- **Req:** REQ-022, REQ-004 | **Type:** Positive | **Level:** UAT | **Technique:** EP | **Category:** Functional
- **Priority:** 1 | **Severity:** Critical | **Risk:** High | **Automation:** Low
- **Test Condition:** A tenant activated through the new workflow can be onboarded from Trilogy
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). A tenant activated through the new workflow (Region Trilogy Base URL = Trilogy instance domain). Machine IP registered in TGO IP Restrictions.
- **Test Data:** Trilogy Domain: loyalty-atm-a02.purplecheckpoint.com; Trilogy Go Domain: trilogy-go-qa01.purplecheckpoint.com

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Log in to Trilogy, select All Properties, go to System > Tenant |  |
| 2 | Search with the Trilogy Domain and Trilogy Go Domain |  |
| 3 | Select the new tenant and click 'Onboard' |  |
| 4 | Click 'Check Connectivity' | Tenant is listed with its Tenant ID, onboarding succeeds and Check Connectivity is successful. |

### TC-060 - TGO - Permissions - Read Only User Views Onboarding Only
- **Req:** REQ-019 | **Type:** Negative | **Level:** System | **Technique:** Decision Table | **Category:** Security
- **Priority:** 2 | **Severity:** High | **Risk:** Medium | **Automation:** High
- **Test Condition:** View TGO Settings users can view onboarding but cannot modify it
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User A has a role with only the 'View TGO Settings' permission (US 1411910) - no create/edit/delete permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Tenants > + (Add Tenant) > Tenant Onboarding > Tenant Information tab. Depends on US 1411910.
- **Test Data:** User A credentials; Pending tenant

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Log in to /tgo as User A and click 'Tenants' |  |
| 2 | Check for the '+' (Add Tenant) icon |  |
| 3 | Open the Pending tenant and view both tabs |  |
| 4 | Look for Save & Next, Add Region, Add Site and inline edit/delete actions | User A can view Tenant Information and the Region/Site hierarchy; Add Tenant, Save & Next, Add Region/Site and edit/delete actions are hidden or disabled. |

### TC-061 - TGO - Permissions - Read Only User Write API Rejected
- **Req:** REQ-019, REQ-010 | **Type:** Negative | **Level:** Integration | **Technique:** Error Guessing | **Category:** Security
- **Priority:** 2 | **Severity:** Critical | **Risk:** High | **Automation:** High
- **Test Condition:** Backend rejects onboarding writes from read-only users
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User A has a role with only the 'View TGO Settings' permission (US 1411910) - no create/edit/delete permissions. Tenant create, Region create and tenant update requests captured from an Admin session. (ref. Bug 1474065)
- **Test Data:** Captured requests replayed with User A's token

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Replay the tenant create request with User A's token |  |
| 2 | Replay the Region create request with User A's token |  |
| 3 | Replay the tenant update request with User A's token | All requests return 403 Forbidden (not 200/500); no tenant, Region or change is persisted. |

### TC-062 - TGO - Permissions - Role Combination Without Create
- **Req:** REQ-019 | **Type:** Negative | **Level:** System | **Technique:** Decision Table | **Category:** Security
- **Priority:** 3 | **Severity:** High | **Risk:** Medium | **Automation:** High
- **Test Condition:** Roles lacking create permission cannot start onboarding
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). Non-admin user with Tenant View + Delete but no Create/Edit permission (ref. Bug 1474065). Breadcrumb: TGO Dashboard (/tgo) > Tenants (list).
- **Test Data:** Non-admin user credentials

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Log in to /tgo as the non-admin user and click 'Tenants' |  |
| 2 | Try to open the Add Tenant workflow via '+' or its direct URL |  |
| 3 | Open an existing tenant's Regions/Sites tab and try Add Region/Add Site | Add Tenant workflow cannot be started (hidden/disabled/forbidden) and Region/Site create actions are unavailable; no data is created. |

### TC-063 - TGO - Audit - Tenant Creation And Activation Logged
- **Req:** REQ-003, REQ-004 | **Type:** Positive | **Level:** Integration | **Technique:** Exploratory | **Category:** Database
- **Priority:** 3 | **Severity:** Medium | **Risk:** Medium | **Automation:** Low
- **Test Condition:** Tenant creation and Pending->Active transition are traceable
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Access to TGO application logs / tenant record timestamps.
- **Test Data:** Tenant created and activated in this run

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Create a tenant via Save & Next and complete onboarding |  |
| 2 | Inspect the tenant record audit fields (created/modified by, timestamps) and application logs | Created-by/modified-by and timestamps reflect the acting user and time of creation and activation; if no audit exists, record under Missing Requirements (no error in logs). |

### TC-064 - TGO - Reports - Pending Tenant In Service Activity Report
- **Req:** REQ-003, REQ-022 | **Type:** Negative | **Level:** System | **Technique:** Exploratory | **Category:** Functional
- **Priority:** 3 | **Severity:** Medium | **Risk:** Medium | **Automation:** Medium
- **Test Condition:** Report tenant selector handles Pending tenants consistently
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. A Pending tenant exists whose Tenant Information was saved via Save & Next and which has no Regions/Sites yet. Breadcrumb: TGO Dashboard (/tgo) > Activity Report.
- **Test Data:** Pending tenant name/ID

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Open Activity Report |  |
| 2 | Open the tenant selector and search for the Pending tenant |  |
| 3 | If listed select it and load the report | Pending tenant is either excluded or selectable with an empty result; no error occurs; behaviour recorded for PO (Missing Requirement). |

### TC-065 - TGO - Performance - Regions Step With Large Hierarchy
- **Req:** REQ-007, REQ-017 | **Type:** Boundary | **Level:** System | **Technique:** BVA | **Category:** Performance
- **Priority:** 3 | **Severity:** Medium | **Risk:** Medium | **Automation:** Medium
- **Test Condition:** Regions/Sites step stays responsive with many Regions/Sites
- **Preconditions:** Build containing US 1407344 deployed to QA (TGO Dashboard https://trilogy-go-qa01.purplecheckpoint.com/tgo). User has an Admin role with Tenant create/edit and Region/Site create/edit permissions. Tenant seeded with 20 Regions and 200 Sites (via API). Assumed threshold <= 3 s (no NFR defined). Breadcrumb: TGO Dashboard (/tgo) > Tenants > <Tenant> > Tenant Onboarding > Regions/Sites tab.
- **Test Data:** 20 Regions x 10 Sites

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Open the seeded tenant's Regions/Sites tab and measure load time (DevTools Performance) |  |
| 2 | Expand all Regions |  |
| 3 | Click 'Save & Next' / completion and measure response time | Grid renders and expands without freezing; load and save complete within the assumed 3 s threshold (record actuals); no request errors. |

## Warnings
- Live UI exploration disabled (story In Development): tab names, button labels (Save & Next, Complete/Finish), status labels and message texts are taken from the story wording and must be confirmed against the build.
- API endpoints and DB/store names for tenant status are not documented in intake; API/Database cases describe the check generically (use browser DevTools / backend team to identify the call/record).
- REQ-019 depends on US 1411910 (Ready for Development) - cases may be Blocked in this sprint.
- Config output_file_basename was TGO_1445170_TestCases (stale, different story) - corrected to TGO_1407344_TestCases to avoid overwriting that workbook.

## Unresolved Artifacts
- PR 185578 (artifact link) - Pull request diff not reviewed - optional evidence only.
- ui_exploration - Disabled in config (story In Development); no live UI observations.
