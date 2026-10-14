# Test Case Review — Story 1387487

**TGO - Align Navigation Menu Structure with Trilogy Platform**
Generated: 2026-09-28 | Mode: dry-run | Output: excel | Cases: **29**

---

## 1. Intake Summary

```
Resolved Story ID     : 1387487
Resolved Story Title  : TGO -  Align Navigation Menu Structure with Trilogy Platform
Project               : Loyalty Kiosk
State / Iteration     : In Development / Sprint 174 - Ending 10.6.2026
Assigned To           : Ortiz, Bruno (Contractor)
Parent                : 1195914 (P4: Tenant Onboarding Feedback — Feature)
Children Reviewed     : 1 (1485166 — "TGO - Menu Structure Alignment - Test Case Design", Task, Active)
Related               : Successors 1481477, 1298793, 1440249; TestedBy 1486056 (existing test case)
Comments              : 2 (US creation ping; note that some effort already done and US may need re-refinement — Estrada, 2026-09-16)
Attachment IDs Found  : b8dd553e (image.png), 3ca9eb8c (image.png), ef5dbfb6 (image.png — "How the menu should look like"),
                        e64658a0 (image.png — "Modification to the menu on Trilogy Go"), a5750258 (image.png)
Local Docs Reviewed   : 0
Feature/Spec Files    : 0
Reference Repo URL    : n/a
Test Instance URL     : https://trilogy-go-qa01.purplecheckpoint.com/tgo (from workflow config)
UI Exploration        : not enabled
Mobile Exploration    : not enabled
Unresolved Artifacts  : 5 (all 5 image attachments — model vision disabled; saved to
                        C:\Users\aravind.shanmugam\Downloads\tgo-1387487-att1..5.png for human review)
```

**Story narrative.** As a TGO user, I want the Trilogy Go navigation menu to follow the same structure and hierarchy as the Trilogy platform, so navigation is consistent, intuitive, and scalable. The Reports menu already exists and report-permission changes are complete. Remaining scope: add **Reports > Admin Reports > TGO Service Activity Report**; move administrative/configuration options to the right-side **Settings** menu; add an **Admin Config** section containing **Tenants**; place **Sites** under **System**; match Trilogy's expanded/collapsed/hover navigation behavior; preserve role-based access.

**Acceptance Criteria (12):**
| # | AC | REQ |
|---|----|-----|
| 1 | Reports remains available in the left navigation | REQ-001 |
| 2 | An Admin Reports submenu is displayed under Reports | REQ-002 |
| 3 | TGO Service Activity Report is displayed under Reports > Admin Reports | REQ-003 |
| 4 | The Service Activity Report navigation item respects the applicable report permissions | REQ-004 |
| 5 | Administrative and configuration options are available from the right-side Settings menu | REQ-005 |
| 6 | An Admin Config section is displayed in Settings | REQ-006 |
| 7 | Tenants is accessible through Settings > Admin Config > Tenants | REQ-007 |
| 8 | Sites is accessible through Settings > System > Sites | REQ-008 |
| 9 | Admin-only navigation options are visible only to authorized administrators | REQ-009 |
| 10 | The navigation works correctly in both expanded and collapsed states | REQ-010 |
| 11 | Hover navigation behaves consistently with the Trilogy platform | REQ-011 |
| 12 | Existing navigation functionality and authorized access continue to work without regression | REQ-012 |

---

## 2. Phase 0 Requirement Analysis

### Business Rules
- BR-01: TGO navigation must mirror the Trilogy platform structure and hierarchy.
- BR-02: Report navigation items must respect the existing report-permission model.
- BR-03: Admin-only navigation options are visible only to authorized administrators.
- BR-04: Administrative/configuration options live in the right-side Settings menu, not the left navigation.
- BR-05: Expanded, collapsed, and hover navigation behavior must be consistent with the Trilogy reference.

### Dependencies
- Report-permission changes (completed in a prior story) — permission name(s) to be confirmed from that story.
- Trilogy platform reference screenshots (5 attachments) — **the authoritative structure spec**; unreadable in this run, saved to Downloads for human review.
- Live Trilogy platform access (or the attachments) for hover-parity comparison (TC-018).
- TGO QA instance: https://trilogy-go-qa01.purplecheckpoint.com/tgo

### Constraints & Assumptions
- Role-based access/visibility must be preserved through the restructure.
- ASM-01: Moved items include at minimum Tenants (Admin Config) and Sites (System); full list is screenshot-defined.
- ASM-02: QA roles exist for: full admin, report-permission-only, no-permission user.
- ASM-03: Settings is invoked from a right-side control, consistent with Trilogy.

### Test Conditions & Risk
| ID | REQ | Condition | Risk |
|----|-----|-----------|------|
| TCOND-001 | REQ-001 | Reports present and functional in left nav | Medium |
| TCOND-002 | REQ-002 | Admin Reports submenu renders under Reports | Medium |
| TCOND-003 | REQ-003 | Service Activity Report reachable via Reports > Admin Reports | Medium |
| TCOND-004 | REQ-004 | Report nav item shown only with permission + enforced server-side | **High** |
| TCOND-005 | REQ-005 | Admin/config options in right-side Settings, gone from old spots | Medium |
| TCOND-006 | REQ-006 | Admin Config section renders in Settings | Medium |
| TCOND-007 | REQ-007 | Tenants opens via Settings > Admin Config > Tenants | Medium |
| TCOND-008 | REQ-008 | Sites opens via Settings > System > Sites | Medium |
| TCOND-009 | REQ-009 | Admin-only options gated in UI and on direct URL | **High** |
| TCOND-010 | REQ-010 | All paths work expanded, collapsed, and across toggles | Medium |
| TCOND-011 | REQ-011 | Hover behavior matches Trilogy | Medium |
| TCOND-012 | REQ-012 | Pre-existing nav items, routes, role access unchanged | **High** |

### Coverage Criteria (declared up front — all achieved)
- 100% AC coverage (12/12 ACs mapped) ✅
- ≥1 Positive + ≥1 Negative (incl. direct-URL bypass) for permission ACs REQ-004/REQ-009 ✅
- Expanded, collapsed, and toggle-transition states each exercised ✅
- Role matrix (admin / report-only / no-permission) exercised against new items ✅

---

## 3. Coverage Summary

| By Type | Count | | By Level | Count | | By Technique | Count |
|---|---|---|---|---|---|---|---|
| Positive | 18 | | System | 26 | | EP | 12 |
| Negative | 8 | | Integration | 2 | | Error Guessing | 7 |
| Boundary | 3 | | UAT | 1 | | Decision Table | 5 |
| **Total** | **29** | | Component | 0 | | BVA | 2 |
| | | | | | State Transition | 1 |
| | | | | | Pairwise | 1 |
| | | | | | Exploratory | 1 |

| By Category | Count |
|---|---|
| Functional | 21 |
| Security | 4 |
| Compatibility | 2 |
| Accessibility | 1 |
| Usability | 1 |

Examples mapping: no SpecFlow/feature files provided — vacuously confirmed (0 Examples rows).

---

## 4. Requirements Traceability Matrix

| REQ | Test Conditions | Test Cases | Levels | Techniques | Covered |
|-----|-----------------|-----------|--------|------------|---------|
| REQ-001 | TCOND-001 | TC-001 | System | EP | ✅ |
| REQ-002 | TCOND-002 | TC-002, TC-022 | System | EP | ✅ |
| REQ-003 | TCOND-003 | TC-003 | System | EP | ✅ |
| REQ-004 | TCOND-004 | TC-004, TC-005, TC-006, TC-022 | System | Decision Table, Error Guessing, EP | ✅ |
| REQ-005 | TCOND-005 | TC-007, TC-010 | System | EP, Error Guessing | ✅ |
| REQ-006 | TCOND-006 | TC-008 | System | EP | ✅ |
| REQ-007 | TCOND-007 | TC-009 | System | EP | ✅ |
| REQ-008 | TCOND-008 | TC-011 | System | EP | ✅ |
| REQ-009 | TCOND-009 | TC-006, TC-012, TC-013, TC-014, TC-021, TC-024 | System, Integration | Decision Table, Error Guessing, Pairwise | ✅ |
| REQ-010 | TCOND-010 | TC-015, TC-016, TC-017, TC-023, TC-025, TC-026 | System | EP, State Transition, Error Guessing, BVA | ✅ |
| REQ-011 | TCOND-011 | TC-018, TC-019, TC-026, TC-029 | System, UAT | Exploratory, Error Guessing, EP, BVA | ✅ |
| REQ-012 | TCOND-012 | TC-020, TC-021, TC-027, TC-028 | System | EP, Decision Table, Error Guessing | ✅ |

---

## 5. Risk Coverage Summary

| Risk Rating | Cases |
|---|---|
| High | 9 |
| Medium | 14 |
| Low | 6 |

High-risk requirements — all covered:
- **REQ-004** (report permission enforcement) — 4 cases incl. direct-URL bypass (TC-006).
- **REQ-009** (admin-only visibility) — 6 cases incl. role matrix (TC-024) and direct-URL denial (TC-014).
- **REQ-012** (no regression) — 4 cases incl. per-role access regression (TC-021) and session expiry (TC-027).

---

## 6. Missing Requirements
1. The complete list of "administrative and configuration options" to move to Settings is defined only by the attached screenshots (unreadable in this run) — verify TC-007/TC-010 item lists against the attachments.
2. No AC states Admin Reports submenu behavior when a user has no admin-report permissions (hidden vs. shown empty).
3. Supported browser matrix and minimum viewport width are not specified.
4. No AC covers mobile/tablet responsive behavior of the new menu (if in scope).

## 7. Ambiguous Requirements
| REQ | Issue | Assumption Made |
|-----|-------|-----------------|
| REQ-004 | Specific permission name(s) for TGO Service Activity Report not named (done in prior story) | QA role setup mirrors the completed report-permission story |
| REQ-005 | Exact set of moved admin/config options only defined by (unreadable) screenshots | At minimum Admin Config > Tenants and System > Sites, per explicit ACs |
| REQ-009 | "Authorized administrators" roles not enumerated | Full-admin QA role is authoritative; confirm role list with PO |
| REQ-011 | Trilogy hover "consistency" has no written spec — only screenshots/live platform | Side-by-side comparison is the oracle (TC-018) |

## 8. Open Questions (for PO)
1. When a user lacks admin-report permission, is Admin Reports fully hidden or shown empty? (TC-022)
2. Which exact items (beyond Tenants and Sites) move into Settings, and from which old locations are they removed? (TC-010)
3. Supported browsers and minimum viewport width? (TC-025, TC-026)
4. Is Sites admin-only, or visible to non-admin roles under Settings > System? (TC-014)

## 9. Additional Exploratory Test Ideas
1. Explore navigation with permissions revoked mid-session to discover stale-menu authorization gaps.
2. Explore hover/flyouts at browser zoom 50%/200% to discover positioning/clipping defects.
3. Explore rapid expand/collapse toggling during page load to discover nav-state race conditions.
4. Explore Settings with a single-permission role (report-only) to discover partially-populated section rendering issues.
5. Explore keyboard + screen reader (NVDA) announcement of the new submenu hierarchy.
6. Explore legacy (pre-move) URLs of Tenants/Sites to discover broken bookmarks / missing redirects.

## 10. Warnings & Unresolved Artifacts
- ⚠️ **5 image attachments could not be visually read** (model vision disabled in this run). Saved to `C:\Users\aravind.shanmugam\Downloads\tgo-1387487-att1..5.png`. Human must verify TC-002, TC-007, TC-010, TC-018 against these reference screenshots.
- ⚠️ No SpecFlow/feature files provided; Examples 1:1 mapping vacuously satisfied.
- ⚠️ Existing test case **1486056** is already linked (TestedBy) to this story — review for overlap before publishing.
- ℹ️ Story comment (2026-09-16): "May need to rework this US given that we've done some of the effort already, we will need to re-refine this" — scope may shift; re-run after re-refinement if ACs change.

## 11. Shared Setups
| ID | Description |
|----|-------------|
| SETUP-01 | Full administrator logged into TGO QA with all admin and report permissions ({{ADMIN_USERNAME}}) |
| SETUP-02 | Non-admin user, NO admin permissions, NO Service Activity Report permission ({{NONADMIN_USERNAME}}) |
| SETUP-03 | User with Service Activity Report permission but NOT full admin ({{REPORT_USER_USERNAME}}) |

---

## 12. Test Cases (29)

> Full metadata and steps are in `testcases-1387487.json` and the Excel workbook. Summary table below; detailed steps follow.

| TC | Title | Type | Level | Technique | Category | Pri | Sev | Risk | Autom. | REQ |
|----|-------|------|-------|-----------|----------|-----|-----|------|--------|-----|
| TC-001 | Reports Menu Remains In Left Navigation | Positive | System | EP | Functional | 2 | High | Medium | High | REQ-001 |
| TC-002 | Admin Reports Submenu Displayed Under Reports | Positive | System | EP | Functional | 2 | High | Medium | High | REQ-002 |
| TC-003 | Service Activity Report Under Reports > Admin Reports | Positive | System | EP | Functional | 1 | High | Medium | High | REQ-003 |
| TC-004 | Report Permission Grants Service Activity Report Access | Positive | System | Decision Table | Functional | 1 | Critical | High | High | REQ-004 |
| TC-005 | Service Activity Report Hidden Without Report Permission | Negative | System | Decision Table | Functional | 1 | Critical | High | High | REQ-004 |
| TC-006 | Direct URL To Service Activity Report Denied Without Permission | Negative | System | Error Guessing | Security | 1 | Critical | High | High | REQ-004, REQ-009 |
| TC-007 | Admin And Config Options Available In Right-Side Settings Menu | Positive | System | EP | Functional | 2 | High | Medium | High | REQ-005 |
| TC-008 | Admin Config Section Displayed In Settings | Positive | System | EP | Functional | 2 | High | Medium | High | REQ-006 |
| TC-009 | Tenants Accessible Via Settings > Admin Config > Tenants | Positive | System | EP | Functional | 1 | High | Medium | High | REQ-007 |
| TC-010 | Moved Admin Options No Longer Shown In Previous Locations | Negative | System | Error Guessing | Functional | 2 | Medium | Medium | Medium | REQ-005 |
| TC-011 | Sites Accessible Via Settings > System > Sites | Positive | System | EP | Functional | 1 | High | Medium | High | REQ-008 |
| TC-012 | Administrator Sees All Admin-Only Navigation Options | Positive | System | Decision Table | Functional | 1 | Critical | High | High | REQ-009 |
| TC-013 | Admin-Only Options Hidden From Non-Admin User | Negative | System | Decision Table | Functional | 1 | Critical | High | High | REQ-009 |
| TC-014 | Direct URL To Tenants Denied For Non-Admin | Negative | Integration | Error Guessing | Security | 1 | Critical | High | High | REQ-009 |
| TC-015 | Navigation Works In Expanded State | Positive | System | EP | Functional | 2 | High | Medium | High | REQ-010 |
| TC-016 | Navigation Works In Collapsed State | Positive | System | EP | Functional | 2 | High | Medium | High | REQ-010 |
| TC-017 | Expand Collapse Toggle Preserves Navigation State | Boundary | System | State Transition | Functional | 3 | Medium | Medium | High | REQ-010 |
| TC-018 | Hover Navigation Matches Trilogy Platform Reference | Positive | UAT | Exploratory | Usability | 2 | Medium | Low | Low | REQ-011 |
| TC-019 | Rapid Hover Across Menu Items Leaves No Stuck Flyouts | Negative | System | Error Guessing | Functional | 3 | Medium | Medium | Medium | REQ-011 |
| TC-020 | Existing Navigation Items Still Route Correctly | Positive | System | EP | Functional | 1 | High | High | High | REQ-012 |
| TC-021 | Existing Role Access Unchanged After Menu Restructure | Positive | System | Decision Table | Functional | 1 | Critical | High | Medium | REQ-012, REQ-009 |
| TC-022 | Admin Reports Submenu Hidden When User Has No Admin Report Permission | Negative | System | EP | Functional | 2 | High | High | High | REQ-002, REQ-004 |
| TC-023 | Keyboard-Only Navigation Through New Menu Structure | Positive | System | Error Guessing | Accessibility | 3 | Medium | Medium | Medium | REQ-010 |
| TC-024 | Role By Menu-Item Visibility Matrix | Positive | Integration | Pairwise | Security | 2 | High | High | High | REQ-009 |
| TC-025 | Navigation At Minimum Supported Viewport Width | Boundary | System | BVA | Compatibility | 3 | Medium | Low | Medium | REQ-010 |
| TC-026 | Navigation Behavior Across Supported Browsers | Positive | System | EP | Compatibility | 3 | Medium | Low | Medium | REQ-010, REQ-011 |
| TC-027 | Navigation Click After Session Expiry Redirects To Login | Negative | System | Error Guessing | Security | 2 | High | High | Medium | REQ-012 |
| TC-028 | Browser Refresh And Deep Link Keep Navigation Consistent | Positive | System | Error Guessing | Functional | 3 | Medium | Low | High | REQ-012 |
| TC-029 | Flyout Rendering At Bottom Edge Of Viewport | Boundary | System | BVA | Functional | 3 | Low | Low | Medium | REQ-011 |

### Detailed Steps

**TC-001 — TGO - Reports Menu Remains In Left Navigation** (SETUP-01)
1. From TGO Home, inspect the left navigation menu.
2. Locate the 'Reports' menu item and click it. → *'Reports' is displayed in the left navigation and clicking it expands/opens the Reports menu without error.*

**TC-002 — TGO - Admin Reports Submenu Displayed Under Reports** (SETUP-01)
1. In the left navigation, expand the 'Reports' menu.
2. Inspect the submenu entries displayed under Reports. → *An 'Admin Reports' submenu is displayed under Reports, positioned per the Trilogy reference structure.*

**TC-003 — TGO - Service Activity Report Under Reports > Admin Reports** (SETUP-01)
1. Expand Reports in the left navigation, then expand 'Admin Reports'.
2. Verify 'TGO Service Activity Report' is listed under Reports > Admin Reports.
3. Click 'TGO Service Activity Report'. → *The report page opens with no error; the nav item is highlighted as active.*

**TC-004 — TGO - Report Permission Grants Service Activity Report Access** (SETUP-03)
1. Expand Reports > Admin Reports in the left navigation.
2. Click 'TGO Service Activity Report'. → *The nav item is visible to this permitted user and the report page opens successfully.*

**TC-005 — TGO - Service Activity Report Hidden Without Report Permission** (SETUP-02)
1. Expand Reports in the left navigation.
2. Inspect the Admin Reports submenu (if displayed) for 'TGO Service Activity Report'. → *Not displayed; no broken/empty placeholder entry.*

**TC-006 — TGO - Direct URL To Service Activity Report Denied Without Permission** (SETUP-02; URL captured in TC-003)
1. Paste the Service Activity Report URL directly into the address bar and navigate.
2. Observe the application response. → *Access denied (unauthorized page or redirect); no report data rendered or returned.*

**TC-007 — TGO - Admin And Config Options Available In Right-Side Settings Menu** (SETUP-01)
1. Click the Settings control on the right side of the TGO header.
2. Inspect the Settings menu contents. → *Settings opens from the right side listing admin/config options (Admin Config, System sections) per the Trilogy reference.*

**TC-008 — TGO - Admin Config Section Displayed In Settings** (SETUP-01)
1. Open the right-side Settings menu.
2. Locate the 'Admin Config' section. → *'Admin Config' section is displayed within Settings.*

**TC-009 — TGO - Tenants Accessible Via Settings > Admin Config > Tenants** (SETUP-01; view only)
1. Open Settings and expand 'Admin Config'.
2. Click 'Tenants'. → *The Tenants page opens successfully without error.*

**TC-010 — TGO - Moved Admin Options No Longer Shown In Previous Locations** (SETUP-01; oracle TBD — screenshots)
1. Inspect the left navigation and other pre-change locations of admin/config options (e.g. Tenants, Sites).
2. Compare against the 'Modification to the menu on Trilogy Go' attachment. → *Moved options no longer appear in old locations (no duplicates); exact list TBD — confirm with PO.*

**TC-011 — TGO - Sites Accessible Via Settings > System > Sites** (SETUP-01; view only)
1. Open Settings and expand 'System'.
2. Click 'Sites'. → *The Sites page opens successfully from Settings > System > Sites.*

**TC-012 — TGO - Administrator Sees All Admin-Only Navigation Options** (SETUP-01)
1. Verify Reports > Admin Reports > TGO Service Activity Report is visible.
2. Open Settings; verify Admin Config > Tenants and System > Sites are visible. → *All admin-only options visible and enabled for the administrator.*

**TC-013 — TGO - Admin-Only Options Hidden From Non-Admin User** (SETUP-02)
1. Inspect the left navigation for admin-only items.
2. Open Settings (if available) and inspect for Admin Config, Tenants, Sites. → *No admin-only option visible; non-admin items remain functional.*

**TC-014 — TGO - Direct URL To Tenants Denied For Non-Admin** (SETUP-02; URLs from TC-009/TC-011)
1. Navigate directly to the Tenants page URL.
2. Repeat with the Sites page URL (when admin-scoped). → *Each admin-only URL rejected; no tenant/site data rendered or returned.*

**TC-015 — TGO - Navigation Works In Expanded State** (SETUP-01)
1. With nav expanded, navigate Reports > Admin Reports > TGO Service Activity Report.
2. Navigate to two additional pre-existing destinations. → *Full labels render, submenus expand inline, all destinations open correctly.*

**TC-016 — TGO - Navigation Works In Collapsed State** (SETUP-01)
1. Collapse the left navigation.
2. Using icons/flyouts, navigate Reports > Admin Reports > TGO Service Activity Report.
3. Navigate to one additional pre-existing destination. → *Icons shown, submenus reachable via flyout per Trilogy reference, all destinations open correctly.*

**TC-017 — TGO - Expand Collapse Toggle Preserves Navigation State** (SETUP-01; start on report page)
1. Toggle expanded↔collapsed 5 consecutive cycles.
2. Inspect the active-item highlight and open a submenu. → *No rendering corruption; active item stays highlighted; submenus still open.*

**TC-018 — TGO - Hover Navigation Matches Trilogy Platform Reference** (SETUP-01; Trilogy reference at hand)
1. In both states, hover over Reports and each Settings section without clicking.
2. Compare hover highlight, flyout appearance/timing, submenu reveal side-by-side with Trilogy. → *Hover behavior consistent with the Trilogy reference for each item.*

**TC-019 — TGO - Rapid Hover Across Menu Items Leaves No Stuck Flyouts** (SETUP-01; collapsed)
1. Rapidly move the pointer across all left-nav items several times.
2. Hover Reports to open its flyout, then move the pointer away. → *Only one flyout open at a time; hover-out closes it; no stuck/overlapping flyouts.*

**TC-020 — TGO - Existing Navigation Items Still Route Correctly** (SETUP-01; pre-change inventory)
1. Click every pre-existing left-nav item (excluding intentionally moved ones).
2. Verify each destination loads and matches pre-change behavior. → *Every pre-existing item present, routes unchanged, pages load without error.*

**TC-021 — TGO - Existing Role Access Unchanged After Menu Restructure** (per-role users; pre-change access matrix)
1. For each existing role, log in and record visible/accessible nav items.
2. Compare against the pre-change matrix (adjusted only for intentional moves). → *No role gained or lost access beyond the intentional menu moves.*

**TC-022 — TGO - Admin Reports Submenu Hidden When User Has No Admin Report Permission** (SETUP-02; oracle TBD)
1. Expand Reports in the left navigation.
2. Inspect whether 'Admin Reports' is displayed. → *No orphaned/empty submenu; hidden-vs-empty behavior TBD — confirm with PO.*

**TC-023 — TGO - Keyboard-Only Navigation Through New Menu Structure** (SETUP-01; no mouse)
1. Keyboard-only: reach TGO Service Activity Report under Reports > Admin Reports.
2. Keyboard-only: open Settings, reach Admin Config > Tenants and System > Sites; Esc closes menus. → *All items keyboard-reachable, visible focus indicator, Esc closes menus/flyouts.*

**TC-024 — TGO - Role By Menu-Item Visibility Matrix** (3 roles × 5 items)
1. For each role×item pair, log in and record visibility and openability.
2. Compare against the expected permission model. → *Zero unexpected grants and zero unexpected denials.*

**TC-025 — TGO - Navigation At Minimum Supported Viewport Width** (SETUP-01; min width TBD)
1. Resize to minimum supported width; exercise the expanded nav path.
2. Repeat collapsed, and at min−1px / min+1px. → *Navigation remains usable at boundary widths; exact minimum TBD — confirm with PO.*

**TC-026 — TGO - Navigation Behavior Across Supported Browsers** (SETUP-01; browser list TBD)
1. On each supported browser, run the core path (expand/collapse, hover, report, Tenants).
2. Compare rendering/behavior across browsers. → *Consistent behavior on every supported browser; list TBD — confirm with PO.*

**TC-027 — TGO - Navigation Click After Session Expiry Redirects To Login** (SETUP-01 then expire session)
1. With session expired, click Reports > Admin Reports > TGO Service Activity Report.
2. Repeat via Settings > Admin Config > Tenants. → *Redirected to login (consistent with pre-change behavior); no data rendered/returned after expiry.*

**TC-028 — TGO - Browser Refresh And Deep Link Keep Navigation Consistent** (SETUP-01)
1. Open the report via nav, then press F5.
2. In a new tab, deep-link to the Tenants URL. → *Pages load, new menu structure renders, correct nav item active in its new location.*

**TC-029 — TGO - Flyout Rendering At Bottom Edge Of Viewport** (SETUP-01; collapsed, reduced window height)
1. Hover the bottom-most nav item near the viewport's bottom edge.
2. Inspect flyout position/content. → *Flyout fully visible within viewport (repositioned if needed); no clipped/unreachable entries.*

---
*Structural validation: `validate-testcases.ps1` — 29/29 cases conform to the canonical structure and ISTQB metadata. Dry-run: no ADO writes performed.*
