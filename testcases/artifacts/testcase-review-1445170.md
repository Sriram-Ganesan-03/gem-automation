# Test-Case Review - User Story 1445170: Receive Receipt Status Updates

> Phase: **development** (baseline) | Run mode: **dry-run** (no ADO writes) | Output: Excel | Generated: 2026-09-30

## Intake Summary
```
Resolved Story ID     : 1445170
Resolved Story Title  : Receive Receipt Status Updates
Project               : Loyalty Kiosk (Area: Loyalty Kiosk\Trilogy Cloud Solutions; Iteration: Sprint 174 - Ending 10.6.2026; State: Ready for QA)
Parent                : 1320913 (P1 - TGO - Mobile Offers + Digital Receipts)
Children Reviewed     : 3 (1487626 Dev- API Enhancement [Closed], 1487629 Dev- unit testing [Closed], 1487218 QA - Analysis, Design and Test Case Creation [New]) - no descriptions/ACs
Related Reviewed      : 1445171 (Expose Player Receipt List API), 1470269 (Ingest CXP Receipt Redeem Status to TCS - successor), 1477501/1477507 (Removed), 1477502, 1477506
Comments              : 1 (Kalyan Asapu 2026-09-28 - wiki link for API details; QA builds available)
Development Refinement: "Have it offset of 5 minutes, during the receipt update status"
Attachment IDs Found  : none
Local Docs Reviewed   : 0
Feature/Spec Files    : 0
Wiki                  : Receipt-Content-Ingestion-&-Status-Update-API (TGO 2.8.0) - route, headers, body, error codes
Reference Repo URL    : trilogy-go-connector PR 186702 (linked, not read)
Test Instance URL     : n/a (UI exploration disabled)
UI Exploration        : not enabled
Mobile Exploration    : not enabled
Unresolved Artifacts  : 0
```

## Requirements
| Req ID | Source | Requirement |
|---|---|---|
| REQ-001 | [Work Item AC] AC1 | Connector exposes an authenticated receipt-status-update endpoint for Trilogy; supports digital and printed receipts; required fields validated before processing. |
| REQ-002 | [Work Item AC] AC2 | Request accepts Player ID, Receipt ID, receipt status and status transaction date. |
| REQ-003 | [Work Item AC] AC3 | Supports Issued, Redeemed, Voided via an extensible status contract; unknown/unsupported values are rejected. |
| REQ-004 | [Work Item AC] AC4 | Receipt located by Receipt ID + player association; only the matching receipt updated; supplied transaction date stored with the status; sibling receipts of the same player unaffected. |
| REQ-005 | [Work Item AC] AC5 | A newly stored receipt can be Issued (digital and printed); an Issued, unexpired receipt remains eligible for the receipt-list API (#1445171) per the property Technical Setting. |
| REQ-006 | [Work Item AC] AC6 | Valid redemption update sets Redeemed and persists the redemption date; Redeemed excluded from the available list (digital and printed); Redeemed cannot revert to Issued. |
| REQ-007 | [Work Item AC] AC7 | Valid void update sets Voided and persists the void date; Voided excluded from the available list (digital and printed); Voided cannot revert to Issued. |
| REQ-008 | [Work Item AC] AC8 | Transitions validated against approved lifecycle rules; invalid transitions rejected and logged; older updates cannot overwrite a newer terminal status; out-of-order updates do not revert the lifecycle. |
| REQ-009 | [Work Item AC] AC9 | Identical repeated updates are idempotent: no new receipt, no corrupted status, approved result returned when the status is already applied. |
| REQ-010 | [Work Item AC] AC10 | Unknown Receipt ID returns the approved not-found response; Player/Receipt mismatch rejected; invalid status or dates rejected; failures use the standard Connector API error format. |
| REQ-011 | [Work Item AC] AC11 | Failed updates return a retryable response; success is never reported unless persisted; a later successful retry yields the correct final state. |
| REQ-012 | [Work Item AC] AC12 | Updated status available to the receipt-list API (#1445171) after persistence; Redeemed/Voided excluded under Digital Only and All Receipts; Connector does not call Trilogy when evaluating availability. |
| REQ-013 | Wiki: Receipt Content Ingestion & Status Update API | Contract: POST /{siteId}/api/v1/player/receipt, headers x-evri-meta + x-evri-tenantid, body {receiptIdentifier, receiptStatus, transactionDate}; 200 on success; 400 TGO-CNT014 Invalid Tenant, TGO-CNT027 Invalid Meta, TGO-CNT039 already redeemed, TGO-CNT038 receipt does not exist, TGO-CNT040 transaction date after expiration date, TGO-CNT034 missing required fields. |
| REQ-014 | [Work Item] Development Refinement | Have an offset of 5 minutes during the receipt status update. |
| REQ-015 | [Work Item] Description / Dependencies and boundaries | This item does not create receipts, does not deliver notifications and does not send status directly to EPG; integration direction is Trilogy -> Connector. |
| REQ-016 | Related #1470269 / #1477506 | CXP redemption / Trilogy void triggers Trilogy to call the Connector status API with the actual transaction date; the voucher/receipt is then excluded from list/detail results. |

## Requirement Analysis (Phase 0)
### Business Rules
- BR-1: Receipt lifecycle is Issued -> Redeemed or Issued -> Voided; Redeemed and Voided are terminal and never revert to Issued (AC6, AC7, AC8).
- BR-2: Only the receipt matching Receipt ID + player association is updated (AC4).
- BR-3: Supplied status transaction date is persisted with the status (AC4, AC6, AC7).
- BR-4: An older update cannot overwrite a newer terminal status (AC8).
- BR-5: Repeating an identical update is idempotent (AC9).
- BR-6: Redeemed and Voided receipts are excluded from the available list under Digital Only and All Receipts (AC12).
- BR-7: Transaction date must not be after the receipt expiration date (Wiki TGO-CNT040).
- BR-8: A 5-minute offset applies during status update (Development Refinement) - semantics unconfirmed.

### Functional Requirements
- Authenticated status-update endpoint (x-evri-tenantid, x-evri-meta).
- Required-field validation (receiptIdentifier, receiptStatus, transactionDate) -> TGO-CNT034.
- Status values Issued/Redeemed/Voided; unsupported values rejected.
- Correct-receipt location and persistence of status + transaction date.
- Transition validation, out-of-order protection, idempotency.
- Standard error format and documented error codes.
- Receipt-list availability reflects persisted status.

### Non Functional Requirements
- Security: tenant/meta authentication, cross-tenant and cross-player isolation, injection resistance, no sensitive data in errors.
- Reliability/Recovery: no false success, retry-safe, concurrency-safe.
- Performance: sustained Trilogy update throughput (SLA not specified).
- Auditability: invalid transitions logged.

### Dependencies
- #1365562 Store Player Receipt Content and Metadata (receipt must exist).
- #1445168 Module Receipt Ingestion (creates receipts for test setup).
- #1445171 Expose Player Receipt List API (consumes stored status).
- #1470269 Ingest CXP Receipt Redeem Status (Trilogy caller for redemptions).
- Property Technical Setting: Digital Only / All Receipts.

### Constraints
- Single route /{siteId}/api/v1/player/receipt serves both ingestion and status update (both documented as POST).
- Connector must not call Trilogy/PKMS when evaluating availability.
- No notifications and no direct EPG calls from this item.

### Assumptions
- Player identity is conveyed by x-evri-meta (the documented status-update body has no Player ID field).
- Status-update requests are distinguished from ingestion by body shape (3 fields) on the shared POST route.
- transactionDate equal to expirationDate is accepted; only strictly-after is rejected with TGO-CNT040.
- The 5-minute offset is a clock-skew tolerance allowing transactionDate up to 5 minutes in the future.
- Duplicate Redeemed returns 400 TGO-CNT039 as the 'approved result' referenced by AC9.

### Test Conditions
| ID | Req | Condition | Risk |
|---|---|---|---|
| TCOND-001 | REQ-001 | Valid authenticated request updates digital and printed receipts. | High |
| TCOND-002 | REQ-001 | Missing/invalid tenant or meta header is rejected (CNT014/CNT027). | High |
| TCOND-003 | REQ-001 | Missing/empty/null required fields rejected with CNT034 before processing. | High |
| TCOND-004 | REQ-002 | All four data elements are accepted and used. | Medium |
| TCOND-005 | REQ-003 | Supported vs unsupported status values (EP). | High |
| TCOND-006 | REQ-004 | Only the matching receipt is updated and the date stored exactly. | High |
| TCOND-007 | REQ-005 | New receipts are Issued and eligible in the list when unexpired. | Medium |
| TCOND-008 | REQ-006 | Redeemed transition, persistence, exclusion, no revert. | High |
| TCOND-009 | REQ-007 | Voided transition, persistence, exclusion, no revert. | High |
| TCOND-010 | REQ-008 | Invalid/out-of-order transitions rejected and logged. | High |
| TCOND-011 | REQ-009 | Duplicate updates are idempotent. | Medium |
| TCOND-012 | REQ-010 | Not-found, mismatch, invalid values rejected in standard error format. | High |
| TCOND-013 | REQ-011 | Failure responses are retryable and never false-success. | High |
| TCOND-014 | REQ-012 | List availability reflects stored status across settings without calling Trilogy. | High |
| TCOND-015 | REQ-013 | Documented route, method, headers, media type and error codes honoured. | Medium |
| TCOND-016 | REQ-014 | 5-minute offset boundaries on transactionDate. | Medium |
| TCOND-017 | REQ-015 | No receipt creation, notifications or EPG calls. | Medium |
| TCOND-018 | REQ-016 | End-to-end Trilogy/CXP-triggered status propagation. | High |

## Coverage Summary (total 69 cases)
- **by_type**: 
- **by_level**: 
- **by_category**: 
- **by_technique**: 
- **examples_mapping_confirmed**: true (no SpecFlow Examples in scope)

## Requirements Traceability Matrix
| Req ID | Test Conditions | Test Case IDs | Levels | Techniques | Covered |
|---|---|---|---|---|---|
| REQ-001 | TCOND-001, TCOND-002, TCOND-003 | TC-001, TC-002, TC-003, TC-004, TC-005, TC-006, TC-007, TC-008, TC-009, TC-010, TC-011, TC-012, TC-013, TC-069 | Integration, System | EP, Error Guessing, BVA | True |
| REQ-002 | TCOND-004 | TC-014, TC-015 | Integration | EP | True |
| REQ-003 | TCOND-005 | TC-016, TC-017, TC-018, TC-019, TC-020 | Integration, Component | EP, BVA, Error Guessing, Exploratory | True |
| REQ-004 | TCOND-006 | TC-007, TC-013, TC-014, TC-021, TC-022, TC-023, TC-024, TC-048 | System, Integration | Error Guessing, EP, BVA | True |
| REQ-005 | TCOND-007 | TC-025, TC-026, TC-027 | Integration, System | EP, Decision Table, BVA | True |
| REQ-006 | TCOND-008 | TC-001, TC-002, TC-028, TC-029, TC-030, TC-066 | Integration, System, UAT | EP, State Transition | True |
| REQ-007 | TCOND-009 | TC-031, TC-032, TC-033, TC-034, TC-067 | Integration, System, UAT | State Transition, Decision Table, EP | True |
| REQ-008 | TCOND-010 | TC-030, TC-034, TC-035, TC-036, TC-037, TC-038, TC-039, TC-040, TC-041, TC-044 | Integration | State Transition, Error Guessing, BVA | True |
| REQ-009 | TCOND-011 | TC-040, TC-042, TC-043, TC-044, TC-045, TC-046, TC-055 | Integration, System | BVA, EP, Error Guessing | True |
| REQ-010 | TCOND-012 | TC-012, TC-015, TC-016, TC-018, TC-019, TC-024, TC-047, TC-048, TC-049, TC-050, TC-051, TC-052, TC-053, TC-056, TC-064 | Integration | Error Guessing, EP, BVA, Decision Table | True |
| REQ-011 | TCOND-013 | TC-041, TC-046, TC-054, TC-055, TC-056, TC-068, TC-069 | Integration, System | Error Guessing, Decision Table, EP | True |
| REQ-012 | TCOND-014 | TC-026, TC-027, TC-028, TC-029, TC-033, TC-057, TC-058, TC-059 | System, Integration | Decision Table, BVA, State Transition, Error Guessing | True |
| REQ-013 | TCOND-015 | TC-001, TC-003, TC-004, TC-005, TC-006, TC-008, TC-009, TC-010, TC-011, TC-031, TC-042, TC-047, TC-050, TC-051, TC-052, TC-060, TC-061, TC-062 | Integration | EP, Error Guessing, BVA, State Transition, Decision Table | True |
| REQ-014 | TCOND-016 | TC-063, TC-064 | Integration | BVA | True |
| REQ-015 | TCOND-017 | TC-045, TC-047, TC-061, TC-065 | Integration | Error Guessing, EP | True |
| REQ-016 | TCOND-018 | TC-066, TC-067, TC-068 | UAT, System | EP, Error Guessing | True |

## Risk Coverage Summary
- By rating: High 40, Medium 26, Low 3
- High-risk requirements: 

## Missing Requirements
- No documented lifecycle rule for terminal-to-terminal transitions (Redeemed <-> Voided); cases TC-035/TC-036 assume rejection.
- Approved not-found / mismatch / invalid-transition error codes are not listed separately in the wiki (only TGO-CNT038/039 exist); confirm codes for Player/Receipt mismatch and Voided-related rejections.
- Retry contract with Trilogy (which HTTP statuses are retryable, retry count/backoff) is not documented.
- No performance SLA (throughput/latency) for the status endpoint.
- Logging format/fields for rejected transitions are not specified.
- Wiki status-update body has no Player ID field while AC2 requires Player ID - confirm source (x-evri-meta assumed).

## Ambiguous Requirements
| Req ID | Issue | Assumption Made |
|---|---|---|
| REQ-014 | Development Refinement 'offset of 5 minutes during the receipt update status' does not say what is offset (future-date tolerance, expiration comparison, or out-of-order window). | transactionDate may be up to 5 minutes ahead of server time; beyond that it is rejected (TC-063/TC-064). |
| REQ-009 | AC9 says duplicates return 'the approved result', while the wiki returns 400 TGO-CNT039 for already-redeemed receipts; no equivalent code is documented for already-voided. | Duplicate Redeemed -> 400 TGO-CNT039; duplicate Voided -> consistent approved result (code to confirm). |
| REQ-013 | Ingestion and status update are both documented as POST on the same route; the discriminator between them is not specified. | Body shape (3-field status body) selects the status-update path (TC-061). |
| REQ-010 | Whether transactionDate equal to expirationDate is 'after' the expiration date. | Equality is accepted; strictly after is rejected with TGO-CNT040 (TC-050/TC-051). |
| REQ-003 | Case sensitivity / whitespace handling of receiptStatus not specified. | Either normalized to canonical value or rejected - never stored non-canonically (TC-017). |

## Additional Exploratory Test Ideas
- Charter: explore status updates for receipts whose expirationDate is null/missing (no-expiration policy #1477504).
- Charter: explore updates arriving while the same receipt is being re-ingested (race between #1445168 and #1445170).
- Charter: explore behaviour when tenant/site is disabled or deleted after receipts were stored.
- Charter: review Connector logs for PII exposure (player IDs, full meta) across success and failure paths.
- Charter: compare list API (#1445171) and detail API (#1470260) exclusion consistency after status updates.
- Charter: explore daylight-saving boundary timestamps and leap-day dates (2028-02-29) for transactionDate.

## Warnings
- Development Refinement '5-minute offset' semantics are assumed (TC-063/TC-064) - confirm with Dev before execution.
- Error codes for Player/Receipt mismatch, invalid transitions and duplicate Voided are not documented; expected results reference 'the approved error' where unspecified.
- Wiki documents POST for the status update (previous baseline used PUT) - cases follow the current wiki.
- Receipt IDs such as <R-D1> are placeholders to be created during test setup; OFFR-R999999999 is used as a non-existent ID and must be confirmed absent.

## Test Cases
### TC-001 - TGO - AC1 - Digital Receipt Issued To Redeemed Returns 200
- **Req:** REQ-001, REQ-006, REQ-013 | **Condition:** TCOND-001 - Authenticated POST with valid headers/body sets an Issued digital receipt to Redeemed and persists the transaction date.
- **Type/Level/Technique/Category:** Positive / Integration / EP / API
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns digital receipt R-D1 (issuanceType=Digital, receiptStatus=Issued, expirationDate in the future).
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"<R-D1>","receiptStatus":"Redeemed","transactionDate":"<now UTC, e.g. 2026-09-25T18:55:17.675Z>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the POST request with valid headers and the body for R-D1. |  |
| 2 | Query ModuleReceiptContent for R-D1 (receiptStatus, transactionDate). | HTTP 200 'Receipt status updated successfully.'; DB shows R-D1 receiptStatus=Redeemed and transactionDate equal to the supplied value. AND verify response header: Content-Type = application/json |

### TC-002 - TGO - AC1 - Printed Receipt Issued To Redeemed Returns 200
- **Req:** REQ-001, REQ-006 | **Condition:** TCOND-001 - The endpoint supports printed (kiosk) receipt records identically to digital ones.
- **Type/Level/Technique/Category:** Positive / Integration / EP / API
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns printed receipt R-P1 (issuanceType=Printed, receiptStatus=Issued, unexpired).
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"<R-P1>","receiptStatus":"Redeemed","transactionDate":"<now UTC>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the POST request for printed receipt R-P1. |  |
| 2 | Query ModuleReceiptContent for R-P1. | HTTP 200; R-P1 receiptStatus=Redeemed with the supplied transactionDate; issuanceType remains Printed and receiptHtml is unchanged. AND verify response header: Content-Type = application/json |

### TC-003 - TGO - AC1 - Missing Tenant Header Returns TGO-CNT014
- **Req:** REQ-001, REQ-013 | **Condition:** TCOND-002 - Request without x-evri-tenantid is rejected before processing.
- **Type/Level/Technique/Category:** Negative / Integration / EP / Security
- **Priority/Severity/Risk/Automation:** 1 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued digital receipt R-D1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; x-evri-tenantid omitted; x-evri-meta=<valid meta for P1>; body {"receiptIdentifier":"<R-D1>","receiptStatus":"Redeemed","transactionDate":"<now UTC>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the POST request without the x-evri-tenantid header. |  |
| 2 | Query ModuleReceiptContent for R-D1. | HTTP 400 with error code TGO-CNT014 'Invalid Tenant' in the standard Connector error format; R-D1 remains Issued with its original transactionDate. AND verify response header: Content-Type = application/json |

### TC-004 - TGO - AC1 - Invalid Tenant Header Returns TGO-CNT014
- **Req:** REQ-001, REQ-013 | **Condition:** TCOND-002 - Unknown, empty or malformed tenant IDs are rejected.
- **Type/Level/Technique/Category:** Negative / Integration / EP / Security
- **Priority/Severity/Risk/Automation:** 2 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued digital receipt R-D1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; x-evri-tenantid variants: <non-existent tenant GUID>, "" (empty), "abc" (malformed); x-evri-meta=<valid meta for P1>; body for R-D1 with receiptStatus=Redeemed

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request with x-evri-tenantid=<non-existent tenant GUID>. |  |
| 2 | Send the request with x-evri-tenantid="" (empty). |  |
| 3 | Send the request with x-evri-tenantid="abc". |  |
| 4 | Query ModuleReceiptContent for R-D1. | Each request returns HTTP 400 TGO-CNT014 'Invalid Tenant' (never 500); R-D1 remains Issued and unchanged. AND verify response header: Content-Type = application/json |

### TC-005 - TGO - AC1 - Missing Meta Header Returns TGO-CNT027
- **Req:** REQ-001, REQ-013 | **Condition:** TCOND-002 - Request without x-evri-meta is rejected.
- **Type/Level/Technique/Category:** Negative / Integration / EP / Security
- **Priority/Severity/Risk/Automation:** 1 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued digital receipt R-D1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; x-evri-tenantid=<valid tenant>; x-evri-meta omitted; body for R-D1 with receiptStatus=Redeemed

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the POST request without the x-evri-meta header. |  |
| 2 | Query ModuleReceiptContent for R-D1. | HTTP 400 TGO-CNT027 'invalid Meta' in the standard error format; R-D1 unchanged. AND verify response header: Content-Type = application/json |

### TC-006 - TGO - AC1 - Tampered Or Malformed Meta Header Returns TGO-CNT027
- **Req:** REQ-001, REQ-013 | **Condition:** TCOND-002 - Malformed, non-decodable or tampered meta header values are rejected.
- **Type/Level/Technique/Category:** Negative / Integration / Error Guessing / Security
- **Priority/Severity/Risk/Automation:** 2 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued digital receipt R-D1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; x-evri-meta variants: "" (empty), random string, valid meta with one character altered, meta for a different site; body for R-D1 with receiptStatus=Redeemed

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request with x-evri-meta="". |  |
| 2 | Send the request with a random non-decodable x-evri-meta string. |  |
| 3 | Send the request with a valid meta value altered by one character. |  |
| 4 | Query ModuleReceiptContent for R-D1. | Each request returns HTTP 400 TGO-CNT027 'invalid Meta' (never 200/500, no stack trace); R-D1 unchanged. AND verify response header: Content-Type = application/json |

### TC-007 - TGO - AC1 - Cross-Tenant Status Update Is Rejected
- **Req:** REQ-001, REQ-004 | **Condition:** TCOND-002 - A caller authenticated for tenant A cannot update a receipt stored under tenant B.
- **Type/Level/Technique/Category:** Negative / System / Error Guessing / Security
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / Medium
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Two tenants TA and TB configured; receipt R-B1 (Issued) belongs to player PB under tenant TB; caller holds valid headers for tenant TA only.
- **Test Data:** POST /{siteId}/api/v1/player/receipt using TA's siteId; x-evri-tenantid=<TA>; x-evri-meta=<valid meta for TA player>; body {"receiptIdentifier":"<R-B1>","receiptStatus":"Voided","transactionDate":"<now UTC>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the POST request with TA headers targeting R-B1. |  |
| 2 | Query ModuleReceiptContent for R-B1 under tenant TB. | Request is rejected with HTTP 400 (TGO-CNT038 'Receipt does not exist' or the approved error) in the standard format; R-B1 stays Issued; no data from tenant TB is disclosed in the response. AND verify response header: Content-Type = application/json |

### TC-008 - TGO - AC1 - Missing receiptIdentifier Returns TGO-CNT034
- **Req:** REQ-001, REQ-013 | **Condition:** TCOND-003 - receiptIdentifier is a required field.
- **Type/Level/Technique/Category:** Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation:** 1 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562).
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptStatus":"Redeemed","transactionDate":"<now UTC>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the POST request with receiptIdentifier omitted from the body. |  |
| 2 | Check ModuleReceiptContent row count for the player. | HTTP 400 TGO-CNT034 'Missing required fields' naming receiptIdentifier; no receipt updated or created. AND verify response header: Content-Type = application/json |

### TC-009 - TGO - AC1 - Missing receiptStatus Returns TGO-CNT034
- **Req:** REQ-001, REQ-013 | **Condition:** TCOND-003 - receiptStatus is a required field.
- **Type/Level/Technique/Category:** Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation:** 1 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued digital receipt R-D1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"<R-D1>","transactionDate":"<now UTC>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the POST request with receiptStatus omitted. |  |
| 2 | Query ModuleReceiptContent for R-D1. | HTTP 400 TGO-CNT034 naming receiptStatus; R-D1 unchanged (still Issued, original transactionDate). AND verify response header: Content-Type = application/json |

### TC-010 - TGO - AC1 - Missing transactionDate Returns TGO-CNT034
- **Req:** REQ-001, REQ-013 | **Condition:** TCOND-003 - transactionDate is a required field.
- **Type/Level/Technique/Category:** Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation:** 1 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued digital receipt R-D1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"<R-D1>","receiptStatus":"Redeemed"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the POST request with transactionDate omitted. |  |
| 2 | Query ModuleReceiptContent for R-D1. | HTTP 400 TGO-CNT034 naming transactionDate; R-D1 unchanged; no default/server date is silently applied. AND verify response header: Content-Type = application/json |

### TC-011 - TGO - AC1 - Empty Whitespace And Null Required Fields Rejected
- **Req:** REQ-001, REQ-013 | **Condition:** TCOND-003 - Empty, whitespace-only and null values are treated as missing.
- **Type/Level/Technique/Category:** Boundary / Integration / BVA / API
- **Priority/Severity/Risk/Automation:** 2 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued digital receipt R-D1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; bodies: receiptIdentifier=""; receiptIdentifier="   "; receiptStatus=null; transactionDate=""; all three null

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request with receiptIdentifier="". |  |
| 2 | Send the request with receiptIdentifier="   ". |  |
| 3 | Send the request with receiptStatus=null. |  |
| 4 | Send the request with transactionDate="". |  |
| 5 | Send the request with all three fields null. |  |
| 6 | Query ModuleReceiptContent for R-D1. | Every request returns HTTP 400 TGO-CNT034 (not 500, not CNT038); R-D1 unchanged. AND verify response header: Content-Type = application/json |

### TC-012 - TGO - AC1 - Empty Or Malformed JSON Body Rejected
- **Req:** REQ-001, REQ-010 | **Condition:** TCOND-003 - Empty or malformed JSON bodies are rejected in the standard error format.
- **Type/Level/Technique/Category:** Negative / Integration / Error Guessing / API
- **Priority/Severity/Risk/Automation:** 2 / Medium / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562).
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; bodies: {} ; no body ; {"receiptIdentifier":"<R-D1>","receiptStatus":"Redeemed" (truncated JSON); JSON array []

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request with body {}. |  |
| 2 | Send the request with no body. |  |
| 3 | Send the request with truncated JSON. |  |
| 4 | Send the request with a JSON array body. | Each returns HTTP 400 (TGO-CNT034 for {} / empty body; standard Connector error format for parse errors); no 500 and no parser internals/stack traces in the response. AND verify response header: Content-Type = application/json |

### TC-013 - TGO - AC1 - Route siteId Not Matching Meta Site Is Rejected
- **Req:** REQ-001, REQ-004 | **Condition:** TCOND-002 - The {siteId} route segment must match the site in x-evri-meta.
- **Type/Level/Technique/Category:** Negative / Integration / Error Guessing / Security
- **Priority/Severity/Risk/Automation:** 2 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Sites S1 and S2 exist in the tenant; receipt R-D1 (Issued) belongs to player P1 at S1.
- **Test Data:** POST /<S2>/api/v1/player/receipt; x-evri-meta=<meta for P1 at S1>; body for R-D1 with receiptStatus=Redeemed

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request to site S2 route with meta for S1. |  |
| 2 | Query ModuleReceiptContent for R-D1. | Request rejected with HTTP 400 (TGO-CNT027 or the approved error) in the standard format; R-D1 unchanged. AND verify response header: Content-Type = application/json |

### TC-014 - TGO - AC2 - Player Receipt Status And Date Accepted Together
- **Req:** REQ-002, REQ-004 | **Condition:** TCOND-004 - Player ID (via x-evri-meta), Receipt ID, status and transaction date are all consumed.
- **Type/Level/Technique/Category:** Positive / Integration / EP / API
- **Priority/Severity/Risk/Automation:** 1 / High / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued digital receipt R-D2.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; x-evri-meta=<meta carrying P1 Player ID>; body {"receiptIdentifier":"<R-D2>","receiptStatus":"Voided","transactionDate":"2026-09-25T18:55:17.675Z"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the POST request for R-D2 with P1's meta. |  |
| 2 | Query ModuleReceiptContent for R-D2 (player association, status, transactionDate). | HTTP 200; R-D2 is still associated with P1, receiptStatus=Voided and transactionDate=2026-09-25T18:55:17.675Z. AND verify response header: Content-Type = application/json |

### TC-015 - TGO - AC2 - Meta Without Player Context Is Rejected
- **Req:** REQ-002, REQ-010 | **Condition:** TCOND-004 - A request whose meta carries no Player ID cannot update a receipt.
- **Type/Level/Technique/Category:** Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation:** 2 / High / Medium / Medium
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued digital receipt R-D1; a valid-tenant meta value without a player identifier is available.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; x-evri-meta=<meta without player id>; body for R-D1 with receiptStatus=Redeemed

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the POST request with meta lacking a player identifier. |  |
| 2 | Query ModuleReceiptContent for R-D1. | HTTP 400 (TGO-CNT027 or TGO-CNT034) in the standard format; R-D1 unchanged. AND verify response header: Content-Type = application/json |

### TC-016 - TGO - AC3 - Unsupported Status Values Rejected
- **Req:** REQ-003, REQ-010 | **Condition:** TCOND-005 - Values outside Issued/Redeemed/Voided are rejected.
- **Type/Level/Technique/Category:** Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation:** 1 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued digital receipt R-D1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; receiptStatus values: "Expired", "Cancelled", "Used", "Pending", "Unknown"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request with receiptStatus="Expired". |  |
| 2 | Send the request with receiptStatus="Cancelled". |  |
| 3 | Send the request with receiptStatus="Used". |  |
| 4 | Send the request with receiptStatus="Pending". |  |
| 5 | Send the request with receiptStatus="Unknown". |  |
| 6 | Query ModuleReceiptContent for R-D1. | Each request returns HTTP 400 in the standard Connector error format identifying receiptStatus as invalid; R-D1 remains Issued; no unsupported value is persisted. AND verify response header: Content-Type = application/json |

### TC-017 - TGO - AC3 - Status Value Casing And Padding Handled Consistently
- **Req:** REQ-003 | **Condition:** TCOND-005 - Case/whitespace variants of valid statuses are either normalized to the canonical value or rejected - never stored as-is.
- **Type/Level/Technique/Category:** Boundary / Integration / BVA / API
- **Priority/Severity/Risk/Automation:** 2 / Medium / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued digital receipts R-D3, R-D4, R-D5.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; R-D3 receiptStatus="redeemed"; R-D4 "REDEEMED"; R-D5 " Redeemed "

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request for R-D3 with "redeemed". |  |
| 2 | Send the request for R-D4 with "REDEEMED". |  |
| 3 | Send the request for R-D5 with " Redeemed ". |  |
| 4 | Query ModuleReceiptContent for R-D3..R-D5. | Behaviour matches the approved contract for all three consistently: either HTTP 200 with receiptStatus stored exactly as canonical 'Redeemed', or HTTP 400 standard error with receipts unchanged. No non-canonical value is stored and all three receipts still appear/disappear from the list consistently. AND verify response header: Content-Type = application/json |

### TC-018 - TGO - AC3 - Numeric And Wrong-Type Status Values Rejected
- **Req:** REQ-003, REQ-010 | **Condition:** TCOND-005 - Enum ordinals and wrong JSON types for receiptStatus are rejected.
- **Type/Level/Technique/Category:** Negative / Integration / Error Guessing / API
- **Priority/Severity/Risk/Automation:** 2 / Medium / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued digital receipt R-D1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; receiptStatus values: 1, 2, -1, true, ["Redeemed"], {"v":"Redeemed"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request with receiptStatus=1. |  |
| 2 | Send the request with receiptStatus=2. |  |
| 3 | Send the request with receiptStatus=-1. |  |
| 4 | Send the request with receiptStatus=true. |  |
| 5 | Send the request with receiptStatus as array and as object. |  |
| 6 | Query ModuleReceiptContent for R-D1. | All return HTTP 400 standard error; enum ordinals are NOT silently mapped to Redeemed/Voided; R-D1 unchanged. AND verify response header: Content-Type = application/json |

### TC-019 - TGO - AC3 - Injection Payloads In Status And Receipt ID Rejected Safely
- **Req:** REQ-003, REQ-010 | **Condition:** TCOND-005 - SQL/script injection strings do not alter data or leak internals.
- **Type/Level/Technique/Category:** Negative / Integration / Error Guessing / Security
- **Priority/Severity/Risk/Automation:** 2 / Critical / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipts R-D1 and R-D2.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; receiptIdentifier="' OR '1'='1"; receiptIdentifier="<R-D1>'; UPDATE ModuleReceiptContent SET receiptStatus='Voided'--"; receiptStatus="<script>alert(1)</script>"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request with receiptIdentifier="' OR '1'='1" and status Voided. |  |
| 2 | Send the request with the stacked-query receiptIdentifier. |  |
| 3 | Send the request for R-D1 with receiptStatus="<script>alert(1)</script>". |  |
| 4 | Query ModuleReceiptContent for all P1 receipts. | Requests return HTTP 400 (TGO-CNT038 / invalid status) with no SQL or stack trace in the body; R-D1 and R-D2 and all other receipts are unchanged. AND verify response header: Content-Type = application/json |

### TC-020 - TGO - AC3 - Status Contract Is Extensible And Documented
- **Req:** REQ-003 | **Condition:** TCOND-005 - The API contract (Swagger/OpenAPI) defines receiptStatus as an extensible string enumeration Issued/Redeemed/Voided.
- **Type/Level/Technique/Category:** Positive / Component / Exploratory / API
- **Priority/Severity/Risk/Automation:** 3 / Medium / Low / Low
- **Preconditions:** Access to the Content Service Swagger/OpenAPI document and the PR 186702 code review for the status enumeration.
- **Test Data:** Content Service OpenAPI document; PR 186702

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Open the Content Service OpenAPI definition for POST /{siteId}/api/v1/player/receipt. |  |
| 2 | Inspect the receiptStatus schema. |  |
| 3 | Review the status mapping in PR 186702. | receiptStatus is a string contract listing Issued, Redeemed, Voided; values are not bound to numeric ordinals; unsupported values are handled by validation (400) rather than a crash, so new statuses can be added without breaking callers. |

### TC-021 - TGO - AC4 - Only Matching Receipt Updated For Player With Multiple Receipts
- **Req:** REQ-004 | **Condition:** TCOND-006 - Updating one receipt does not change sibling receipts of the same player.
- **Type/Level/Technique/Category:** Positive / Integration / EP / Database
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipts R-D1 (digital), R-D2 (digital) and R-P1 (printed); original rows snapshotted.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"<R-D1>","receiptStatus":"Redeemed","transactionDate":"<now UTC>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Snapshot ModuleReceiptContent rows for R-D1, R-D2, R-P1. |  |
| 2 | Send the Redeemed update for R-D1. |  |
| 3 | Re-query all three rows and compare with the snapshot. | HTTP 200; only R-D1 changes (Redeemed + new transactionDate); R-D2 and R-P1 are byte-for-byte identical to the snapshot (status, dates, HTML, metadata). AND verify response header: Content-Type = application/json |

### TC-022 - TGO - AC4 - Same Receipt ID Under Different Player Not Affected
- **Req:** REQ-004 | **Condition:** TCOND-006 - Receipt is located by Receipt ID AND player association.
- **Type/Level/Technique/Category:** Negative / Integration / Error Guessing / Database
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / Medium
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Identical receiptIdentifier value <R-X> exists for player P1 and for player P2 (different module/site if uniqueness requires); both Issued.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; x-evri-meta=<meta for P1>; body {"receiptIdentifier":"<R-X>","receiptStatus":"Voided","transactionDate":"<now UTC>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the Voided update for <R-X> with P1's meta. |  |
| 2 | Query ModuleReceiptContent for <R-X> of P1 and of P2. | HTTP 200; P1's <R-X> is Voided; P2's <R-X> remains Issued with its original transactionDate. AND verify response header: Content-Type = application/json |

### TC-023 - TGO - AC4 - Transaction Date Stored With Full Precision
- **Req:** REQ-004 | **Condition:** TCOND-006 - Supplied transactionDate is stored exactly (millisecond precision, UTC instant preserved).
- **Type/Level/Technique/Category:** Boundary / Integration / BVA / Database
- **Priority/Severity/Risk/Automation:** 2 / Medium / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipts R-D1 and R-D2 with expirationDate well in the future.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; R-D1 transactionDate="2026-09-25T18:55:17.675Z"; R-D2 transactionDate="2026-09-25T18:55:17Z" (no fraction)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the Redeemed update for R-D1 with 2026-09-25T18:55:17.675Z. |  |
| 2 | Send the Redeemed update for R-D2 with 2026-09-25T18:55:17Z. |  |
| 3 | Query ModuleReceiptContent for both. | Both HTTP 200; R-D1 stores 2026-09-25T18:55:17.675Z and R-D2 stores 2026-09-25T18:55:17.000Z - no truncation, rounding or local-time shift. AND verify response header: Content-Type = application/json |

### TC-024 - TGO - AC4 - Non-UTC Offset Transaction Date Normalized Correctly
- **Req:** REQ-004, REQ-010 | **Condition:** TCOND-006 - Offsets in transactionDate are converted to the correct instant.
- **Type/Level/Technique/Category:** Boundary / Integration / BVA / Database
- **Priority/Severity/Risk/Automation:** 2 / Medium / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipt R-D1 (expirationDate well in the future).
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; transactionDate="2026-09-25T13:25:17.675-05:30" (== 2026-09-25T18:55:17.675Z)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the Redeemed update for R-D1 with the -05:30 offset date. |  |
| 2 | Query ModuleReceiptContent for R-D1. | HTTP 200; the stored instant equals 2026-09-25T18:55:17.675Z (no double conversion or offset loss). AND verify response header: Content-Type = application/json |

### TC-025 - TGO - AC5 - Newly Ingested Digital And Printed Receipts Are Issued
- **Req:** REQ-005 | **Condition:** TCOND-007 - A newly stored receipt (digital or printed) carries Issued status.
- **Type/Level/Technique/Category:** Positive / Integration / EP / Database
- **Priority/Severity/Risk/Automation:** 2 / High / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 exists; ingestion API (#1445168) available.
- **Test Data:** POST /{siteId}/api/v1/player/receipt (ingestion body); R-N1 issuanceType=Digital, receiptStatus=Issued; R-N2 issuanceType=Printed, receiptStatus=Issued; expirationDate = now + 7 days

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Ingest digital receipt R-N1 with receiptStatus=Issued. |  |
| 2 | Ingest printed receipt R-N2 with receiptStatus=Issued. |  |
| 3 | Query ModuleReceiptContent for R-N1 and R-N2. | Both ingestions return HTTP 200 'Receipt ingested successfully.'; both rows exist with receiptStatus=Issued and the supplied transaction/expiration dates. AND verify response header: Content-Type = application/json |

### TC-026 - TGO - AC5 - Issued Unexpired Receipts Listed Per Technical Setting
- **Req:** REQ-005, REQ-012 | **Condition:** TCOND-007 - Issued, unexpired receipts are returned by the list API according to Digital Only / All Receipts.
- **Type/Level/Technique/Category:** Positive / System / Decision Table / Functional
- **Priority/Severity/Risk/Automation:** 1 / High / High / Medium
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued unexpired digital receipt R-D1 and printed receipt R-P1; Player Receipt List API (#1445171) deployed; ability to change the property Technical Setting.
- **Test Data:** Technical Setting: Digital Only, then All Receipts; list API for P1

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Set the property Technical Setting to Digital Only. |  |
| 2 | Call the player receipt-list API for P1. |  |
| 3 | Set the Technical Setting to All Receipts. |  |
| 4 | Call the receipt-list API for P1 again. | Digital Only: R-D1 returned, R-P1 not returned. All Receipts: both R-D1 and R-P1 returned with their Receipt URLs. |

### TC-027 - TGO - AC5 - Issued Receipt Excluded Once Expired
- **Req:** REQ-005, REQ-012 | **Condition:** TCOND-007 - Issued receipts are eligible only while unexpired.
- **Type/Level/Technique/Category:** Boundary / System / BVA / Functional
- **Priority/Severity/Risk/Automation:** 2 / Medium / Medium / Medium
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Technical Setting = All Receipts; Player P1 owns Issued receipts R-E1 (expirationDate = now + 2 minutes) and R-E2 (expirationDate = now - 1 minute).
- **Test Data:** Receipt-list API for P1 at T0, then at T0 + 3 minutes

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Call the receipt-list API for P1 at T0. |  |
| 2 | Wait until R-E1's expirationDate has passed (T0 + 3 min). |  |
| 3 | Call the receipt-list API for P1 again. | At T0: R-E1 listed, R-E2 not listed. After expiry: neither R-E1 nor R-E2 listed; both remain Issued in the DB (expiry does not change status). |

### TC-028 - TGO - AC6 - Redeemed Digital Receipt Excluded From List
- **Req:** REQ-006, REQ-012 | **Condition:** TCOND-008 - A Redeemed digital receipt disappears from the available list.
- **Type/Level/Technique/Category:** Positive / System / State Transition / Functional
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Technical Setting = Digital Only; Player P1 owns Issued unexpired digital receipt R-D1 visible in the list API.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"<R-D1>","receiptStatus":"Redeemed","transactionDate":"<now UTC>"}; list API for P1

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Call the list API and confirm R-D1 is present. |  |
| 2 | Send the Redeemed status update for R-D1. |  |
| 3 | Call the list API for P1 again. | Status update returns HTTP 200; the subsequent list response no longer contains R-D1. |

### TC-029 - TGO - AC6 - Redeemed Printed Receipt Excluded Under All Receipts
- **Req:** REQ-006, REQ-012 | **Condition:** TCOND-008 - Same Redeemed exclusion applies to printed receipts.
- **Type/Level/Technique/Category:** Positive / System / State Transition / Functional
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Technical Setting = All Receipts; Player P1 owns Issued unexpired printed receipt R-P1 visible in the list API.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"<R-P1>","receiptStatus":"Redeemed","transactionDate":"<now UTC>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Call the list API and confirm R-P1 is present. |  |
| 2 | Send the Redeemed status update for R-P1. |  |
| 3 | Call the list API for P1 again. | Status update returns HTTP 200; R-P1 is no longer returned by the list API. |

### TC-030 - TGO - AC6 - Redeemed Receipt Cannot Revert To Issued
- **Req:** REQ-006, REQ-008 | **Condition:** TCOND-008 - Redeemed -> Issued is an invalid transition.
- **Type/Level/Technique/Category:** Negative / Integration / State Transition / Functional
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns receipt R-D1 already Redeemed at T1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"<R-D1>","receiptStatus":"Issued","transactionDate":"<T1 + 10 min>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send an Issued update for Redeemed receipt R-D1 with a later transactionDate. |  |
| 2 | Query ModuleReceiptContent for R-D1. |  |
| 3 | Call the list API for P1. | HTTP 400 (TGO-CNT039 'Receipt has already been redeemed' or the approved invalid-transition error) in the standard format; R-D1 stays Redeemed with transactionDate T1 and remains excluded from the list. AND verify response header: Content-Type = application/json |

### TC-031 - TGO - AC7 - Digital Receipt Issued To Voided Returns 200
- **Req:** REQ-007, REQ-013 | **Condition:** TCOND-009 - Valid void update sets a digital receipt to Voided and persists the void date.
- **Type/Level/Technique/Category:** Positive / Integration / State Transition / API
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued unexpired digital receipt R-D2.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"<R-D2>","receiptStatus":"Voided","transactionDate":"<now UTC>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the Voided status update for R-D2. |  |
| 2 | Query ModuleReceiptContent for R-D2. | HTTP 200; R-D2 receiptStatus=Voided with transactionDate equal to the supplied void date. AND verify response header: Content-Type = application/json |

### TC-032 - TGO - AC7 - Printed Receipt Issued To Voided Returns 200
- **Req:** REQ-007 | **Condition:** TCOND-009 - Void processing applies to printed receipts.
- **Type/Level/Technique/Category:** Positive / Integration / State Transition / API
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued unexpired printed receipt R-P2.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"<R-P2>","receiptStatus":"Voided","transactionDate":"<now UTC>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the Voided status update for R-P2. |  |
| 2 | Query ModuleReceiptContent for R-P2. | HTTP 200; R-P2 receiptStatus=Voided with the supplied void date; printed metadata/HTML untouched. AND verify response header: Content-Type = application/json |

### TC-033 - TGO - AC7 - Voided Receipts Excluded Under Both Settings
- **Req:** REQ-007, REQ-012 | **Condition:** TCOND-009 - Voided digital and printed receipts are excluded from the list under Digital Only and All Receipts.
- **Type/Level/Technique/Category:** Positive / System / Decision Table / Functional
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / Medium
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued unexpired digital receipt R-D2 and printed receipt R-P2, both visible under All Receipts.
- **Test Data:** Voided updates for R-D2 and R-P2; Technical Setting Digital Only and All Receipts

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send Voided updates for R-D2 and R-P2. |  |
| 2 | With Technical Setting = All Receipts, call the list API for P1. |  |
| 3 | Switch Technical Setting to Digital Only and call the list API again. | Both updates return HTTP 200; neither R-D2 nor R-P2 appears in either list response. |

### TC-034 - TGO - AC7 - Voided Receipt Cannot Revert To Issued
- **Req:** REQ-007, REQ-008 | **Condition:** TCOND-009 - Voided -> Issued is an invalid transition.
- **Type/Level/Technique/Category:** Negative / Integration / State Transition / Functional
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns receipt R-D2 already Voided at T1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"<R-D2>","receiptStatus":"Issued","transactionDate":"<T1 + 10 min>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send an Issued update for Voided receipt R-D2. |  |
| 2 | Query ModuleReceiptContent for R-D2. |  |
| 3 | Call the list API for P1. | HTTP 400 invalid-transition error in the standard format; R-D2 stays Voided with transactionDate T1 and remains excluded from the list. AND verify response header: Content-Type = application/json |

### TC-035 - TGO - AC8 - Redeemed To Voided Transition Rejected
- **Req:** REQ-008 | **Condition:** TCOND-010 - Terminal-to-terminal transition Redeemed -> Voided is rejected (per approved lifecycle rules).
- **Type/Level/Technique/Category:** Negative / Integration / State Transition / Functional
- **Priority/Severity/Risk/Automation:** 1 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns receipt R-D1 Redeemed at T1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"<R-D1>","receiptStatus":"Voided","transactionDate":"<T1 + 5 min>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send a Voided update for Redeemed receipt R-D1. |  |
| 2 | Query ModuleReceiptContent for R-D1. |  |
| 3 | Check Connector logs for the request. | HTTP 400 (TGO-CNT039 'Receipt has already been redeemed' or the approved error); R-D1 stays Redeemed with T1; the rejected transition is logged. AND verify response header: Content-Type = application/json |

### TC-036 - TGO - AC8 - Voided To Redeemed Transition Rejected
- **Req:** REQ-008 | **Condition:** TCOND-010 - Terminal-to-terminal transition Voided -> Redeemed is rejected.
- **Type/Level/Technique/Category:** Negative / Integration / State Transition / Functional
- **Priority/Severity/Risk/Automation:** 1 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns receipt R-D2 Voided at T1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"<R-D2>","receiptStatus":"Redeemed","transactionDate":"<T1 + 5 min>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send a Redeemed update for Voided receipt R-D2. |  |
| 2 | Query ModuleReceiptContent for R-D2. |  |
| 3 | Check Connector logs for the request. | HTTP 400 invalid-transition error in the standard format; R-D2 stays Voided with T1; the rejection is logged. AND verify response header: Content-Type = application/json |

### TC-037 - TGO - AC8 - Invalid Transition Log Entry Content
- **Req:** REQ-008 | **Condition:** TCOND-010 - Rejected transitions produce a log entry with enough detail to investigate.
- **Type/Level/Technique/Category:** Negative / Integration / Error Guessing / Functional
- **Priority/Severity/Risk/Automation:** 2 / Medium / Medium / Medium
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Access to Connector Content Service logs; Player P1 owns receipt R-D1 Redeemed.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body for R-D1 with receiptStatus=Issued

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the invalid Issued update for R-D1 and note the response correlation/trace ID. |  |
| 2 | Search the Content Service logs by the correlation ID. | A log entry exists with timestamp, tenant/site, receiptIdentifier, current status (Redeemed), requested status (Issued), rejection reason and correlation ID; no sensitive header values (full x-evri-meta) are logged in clear text. |

### TC-038 - TGO - AC8 - Older Update Cannot Overwrite Newer Terminal Status
- **Req:** REQ-008 | **Condition:** TCOND-010 - An update with an earlier transactionDate than the stored terminal status is not applied.
- **Type/Level/Technique/Category:** Boundary / Integration / State Transition / Functional
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipt R-D3.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; update A: Redeemed @ T2=2026-09-25T18:55:17.675Z; update B: Voided @ T1=2026-09-25T18:50:00.000Z

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send update A (Redeemed @ T2) for R-D3. |  |
| 2 | Send update B (Voided @ T1, older) for R-D3. |  |
| 3 | Query ModuleReceiptContent for R-D3. | Update A returns 200; update B is rejected (HTTP 400 standard error) and logged; R-D3 remains Redeemed with transactionDate T2. AND verify response header: Content-Type = application/json |

### TC-039 - TGO - AC8 - Out-Of-Order Issued After Terminal Does Not Revert
- **Req:** REQ-008 | **Condition:** TCOND-010 - A delayed Issued event arriving after Voided does not revert the lifecycle.
- **Type/Level/Technique/Category:** Boundary / Integration / State Transition / Functional
- **Priority/Severity/Risk/Automation:** 1 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns receipt R-D4 ingested Issued at T0.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; Voided @ T0+10m, then Issued @ T0+1m (late arrival)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send Voided @ T0+10m for R-D4. |  |
| 2 | Send delayed Issued @ T0+1m for R-D4. |  |
| 3 | Query ModuleReceiptContent for R-D4 and call the list API. | R-D4 remains Voided with transactionDate T0+10m; the late Issued update is rejected; R-D4 is not returned by the list API. |

### TC-040 - TGO - AC8 - Equal Timestamp Conflicting Terminal Updates
- **Req:** REQ-008, REQ-009 | **Condition:** TCOND-010 - Two different terminal statuses with identical transactionDate resolve deterministically.
- **Type/Level/Technique/Category:** Boundary / Integration / BVA / Functional
- **Priority/Severity/Risk/Automation:** 2 / High / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipt R-D5.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; Redeemed @ T and Voided @ T (same instant 2026-09-25T18:55:17.675Z)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send Redeemed @ T for R-D5. |  |
| 2 | Send Voided @ T for R-D5. |  |
| 3 | Query ModuleReceiptContent for R-D5. | First update returns 200; second is rejected (HTTP 400 standard error, logged); R-D5 remains Redeemed @ T - no flip-flop and no mixed state. AND verify response header: Content-Type = application/json |

### TC-041 - TGO - AC8 - Concurrent Redeem And Void Leave One Consistent State
- **Req:** REQ-008, REQ-011 | **Condition:** TCOND-010 - Simultaneous conflicting updates do not corrupt the receipt.
- **Type/Level/Technique/Category:** Negative / Integration / Error Guessing / Database
- **Priority/Severity/Risk/Automation:** 2 / Critical / High / Medium
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipt R-D6; a load tool able to fire parallel requests.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; 10 parallel Redeemed and 10 parallel Voided updates for R-D6 with the same transactionDate

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Fire the 20 requests concurrently. |  |
| 2 | Collect all response codes. |  |
| 3 | Query ModuleReceiptContent for R-D6 (single row). | Exactly one terminal state is persisted (Redeemed or Voided) with a matching transactionDate; responses are 200 only for requests consistent with the final state, others 400; no 500s, no deadlock, still one row for R-D6. |

### TC-042 - TGO - AC9 - Duplicate Redeemed Update Returns Approved Result
- **Req:** REQ-009, REQ-013 | **Condition:** TCOND-011 - Repeating an identical Redeemed update is idempotent.
- **Type/Level/Technique/Category:** Positive / Integration / EP / API
- **Priority/Severity/Risk/Automation:** 1 / High / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipt R-D1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"<R-D1>","receiptStatus":"Redeemed","transactionDate":"2026-09-25T18:55:17.675Z"} sent twice

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the Redeemed update for R-D1. |  |
| 2 | Send the identical request again. |  |
| 3 | Query ModuleReceiptContent for R-D1. | First call 200; second call returns the approved already-applied result (per wiki HTTP 400 TGO-CNT039 'Receipt has already been redeemed'); one row for R-D1, Redeemed @ 2026-09-25T18:55:17.675Z, unchanged by the duplicate. AND verify response header: Content-Type = application/json |

### TC-043 - TGO - AC9 - Duplicate Voided Update Is Idempotent
- **Req:** REQ-009 | **Condition:** TCOND-011 - Repeating an identical Voided update is idempotent.
- **Type/Level/Technique/Category:** Positive / Integration / EP / API
- **Priority/Severity/Risk/Automation:** 2 / High / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipt R-D2.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; identical Voided body for R-D2 sent 3 times

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the Voided update for R-D2. |  |
| 2 | Repeat the identical request twice. |  |
| 3 | Query ModuleReceiptContent for R-D2. | First call 200; repeats return the approved already-applied result consistently (same code/message each time); R-D2 stays Voided with the original date; no extra rows. AND verify response header: Content-Type = application/json |

### TC-044 - TGO - AC9 - Same Status With Different Date Does Not Overwrite Original
- **Req:** REQ-009, REQ-008 | **Condition:** TCOND-011 - A repeat of the same status with a newer date does not move the original transaction date.
- **Type/Level/Technique/Category:** Boundary / Integration / BVA / Database
- **Priority/Severity/Risk/Automation:** 2 / High / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns receipt R-D1 Redeemed @ T1=2026-09-25T18:55:17.675Z.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; Redeemed @ T1 + 1 ms, then Redeemed @ T1 + 1 day

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send Redeemed @ T1 + 1 ms for R-D1. |  |
| 2 | Send Redeemed @ T1 + 1 day for R-D1. |  |
| 3 | Query ModuleReceiptContent for R-D1. | Both return the approved already-redeemed result (TGO-CNT039); R-D1 transactionDate stays exactly T1. AND verify response header: Content-Type = application/json |

### TC-045 - TGO - AC9 - Duplicate Update Never Creates A Receipt
- **Req:** REQ-009, REQ-015 | **Condition:** TCOND-011 - Status updates never insert new receipt rows.
- **Type/Level/Technique/Category:** Negative / Integration / Error Guessing / Database
- **Priority/Severity/Risk/Automation:** 2 / High / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipt R-D3; row count for P1 recorded.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; identical Voided update for R-D3 sent 5 times

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Record the ModuleReceiptContent row count for P1. |  |
| 2 | Send the identical Voided update 5 times. |  |
| 3 | Re-count rows for P1 and for receiptIdentifier R-D3. | Row count for P1 unchanged; exactly one row for R-D3 (Voided). |

### TC-046 - TGO - AC9 - Burst Of Identical Parallel Updates Stays Consistent
- **Req:** REQ-009, REQ-011 | **Condition:** TCOND-011 - Parallel identical retries (e.g. Trilogy retry storm) remain idempotent.
- **Type/Level/Technique/Category:** Boundary / Integration / Error Guessing / Performance
- **Priority/Severity/Risk/Automation:** 3 / High / Medium / Medium
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipt R-D4; a load tool able to fire parallel requests.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; 25 identical Redeemed requests for R-D4 fired concurrently

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Fire 25 identical Redeemed requests in parallel. |  |
| 2 | Collect all responses. |  |
| 3 | Query ModuleReceiptContent for R-D4. | Exactly one 200 and the remainder return the approved already-applied result (no 500s/timeouts); one row, Redeemed with the supplied date. |

### TC-047 - TGO - AC10 - Unknown Receipt ID Returns TGO-CNT038
- **Req:** REQ-010, REQ-013, REQ-015 | **Condition:** TCOND-012 - Unknown Receipt ID returns the approved not-found response and does not create a receipt.
- **Type/Level/Technique/Category:** Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation:** 1 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Receipt ID OFFR-R999999999 does not exist for the tenant.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; body {"receiptIdentifier":"OFFR-R999999999","receiptStatus":"Redeemed","transactionDate":"<now UTC>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the status update for the non-existent receipt ID. |  |
| 2 | Query ModuleReceiptContent for OFFR-R999999999. | HTTP 400 TGO-CNT038 'Receipt does not exist.' in the standard format; no row created. AND verify response header: Content-Type = application/json |

### TC-048 - TGO - AC10 - Player And Receipt Mismatch Rejected
- **Req:** REQ-010, REQ-004 | **Condition:** TCOND-012 - A receipt owned by another player cannot be updated.
- **Type/Level/Technique/Category:** Negative / Integration / EP / Security
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P2 owns Issued receipt R-Q1; caller meta identifies player P1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; x-evri-meta=<meta for P1>; body {"receiptIdentifier":"<R-Q1>","receiptStatus":"Voided","transactionDate":"<now UTC>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the Voided update for R-Q1 with P1's meta. |  |
| 2 | Query ModuleReceiptContent for R-Q1. | HTTP 400 (approved mismatch / TGO-CNT038) in the standard format without revealing that R-Q1 exists for P2; R-Q1 remains Issued. AND verify response header: Content-Type = application/json |

### TC-049 - TGO - AC10 - Invalid Transaction Date Formats Rejected
- **Req:** REQ-010 | **Condition:** TCOND-012 - Non-ISO or impossible dates are rejected.
- **Type/Level/Technique/Category:** Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation:** 1 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipt R-D1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; transactionDate values: "2026-13-45T00:00:00Z", "2026-02-30T10:00:00Z", "not-a-date", "25/09/2026", 1758826517675 (epoch number)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request with transactionDate="2026-13-45T00:00:00Z". |  |
| 2 | Send the request with "2026-02-30T10:00:00Z". |  |
| 3 | Send the request with "not-a-date". |  |
| 4 | Send the request with "25/09/2026". |  |
| 5 | Send the request with numeric epoch 1758826517675. |  |
| 6 | Query ModuleReceiptContent for R-D1. | Each returns HTTP 400 standard error identifying transactionDate; R-D1 unchanged. AND verify response header: Content-Type = application/json |

### TC-050 - TGO - AC10 - Transaction Date After Expiration Returns TGO-CNT040
- **Req:** REQ-010, REQ-013 | **Condition:** TCOND-012 - transactionDate just after expirationDate is rejected.
- **Type/Level/Technique/Category:** Boundary / Integration / BVA / API
- **Priority/Severity/Risk/Automation:** 1 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipt R-X1 with expirationDate E=2026-09-26T18:55:17.675Z.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; transactionDate = E + 1 ms (2026-09-26T18:55:17.676Z) and E + 1 day

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send Redeemed for R-X1 with transactionDate=E + 1 ms. |  |
| 2 | Send Redeemed for R-X1 with transactionDate=E + 1 day. |  |
| 3 | Query ModuleReceiptContent for R-X1. | Both return HTTP 400 TGO-CNT040 'Provided transaction date is after the expiration date.'; R-X1 remains Issued. AND verify response header: Content-Type = application/json |

### TC-051 - TGO - AC10 - Transaction Date At And Just Before Expiration Accepted
- **Req:** REQ-010, REQ-013 | **Condition:** TCOND-012 - transactionDate equal to or 1 ms before expirationDate is accepted.
- **Type/Level/Technique/Category:** Boundary / Integration / BVA / API
- **Priority/Severity/Risk/Automation:** 2 / Medium / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipts R-X2 and R-X3, both with expirationDate E=2026-09-26T18:55:17.675Z.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; R-X2 transactionDate = E; R-X3 transactionDate = E - 1 ms

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send Redeemed for R-X2 with transactionDate = E. |  |
| 2 | Send Redeemed for R-X3 with transactionDate = E - 1 ms. |  |
| 3 | Query both rows. | Both return HTTP 200 and are stored Redeemed with the supplied dates (equality is not treated as 'after'). AND verify response header: Content-Type = application/json |

### TC-052 - TGO - AC10 - All Errors Use Standard Connector Error Format
- **Req:** REQ-010, REQ-013 | **Condition:** TCOND-012 - Every documented error code uses the same standard error body shape.
- **Type/Level/Technique/Category:** Negative / Integration / Decision Table / API
- **Priority/Severity/Risk/Automation:** 2 / Medium / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Receipts available to trigger each documented error: redeemed R-D1, expiring R-X1, and a non-existent ID.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; trigger TGO-CNT014 (bad tenant), TGO-CNT027 (bad meta), TGO-CNT034 (missing field), TGO-CNT038 (unknown ID), TGO-CNT039 (already redeemed), TGO-CNT040 (date after expiry)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Trigger TGO-CNT014. |  |
| 2 | Trigger TGO-CNT027. |  |
| 3 | Trigger TGO-CNT034. |  |
| 4 | Trigger TGO-CNT038. |  |
| 5 | Trigger TGO-CNT039. |  |
| 6 | Trigger TGO-CNT040. |  |
| 7 | Compare the six response bodies. | All six return HTTP 400 with the same standard Connector error schema (error code + message fields populated, codes and messages match the wiki table); no stack traces or internal identifiers. AND verify response header: Content-Type = application/json |

### TC-053 - TGO - AC10 - Receipt ID Length And Special Character Boundaries
- **Req:** REQ-010 | **Condition:** TCOND-012 - Oversized or special-character receipt IDs are handled without server errors.
- **Type/Level/Technique/Category:** Boundary / Integration / BVA / API
- **Priority/Severity/Risk/Automation:** 3 / Medium / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562).
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; receiptIdentifier: 1 char "A"; 255 chars; 4000 chars; "OFFR-R%00"; unicode "OFFR-Ré中"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request with a 1-character receiptIdentifier. |  |
| 2 | Send with a 255-character receiptIdentifier. |  |
| 3 | Send with a 4000-character receiptIdentifier. |  |
| 4 | Send with a null-byte / URL-encoded identifier. |  |
| 5 | Send with a unicode identifier. | Each returns HTTP 400 (TGO-CNT038 or validation error) in the standard format; no 500, no truncation-based match against an existing receipt. AND verify response header: Content-Type = application/json |

### TC-054 - TGO - AC11 - Database Outage Returns Retryable Error Then Retry Succeeds
- **Req:** REQ-011 | **Condition:** TCOND-013 - No false success when persistence fails; a later retry reaches the correct final state.
- **Type/Level/Technique/Category:** Negative / System / Error Guessing / Recovery
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / Low
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Ability to make the ModuleReceiptContent database unavailable in QA (stop/deny connection); Player P1 owns Issued receipt R-D5.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; Redeemed body for R-D5

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Make the ModuleReceiptContent database unavailable. |  |
| 2 | Send the Redeemed update for R-D5. |  |
| 3 | Restore the database and query R-D5. |  |
| 4 | Retry the identical Redeemed update. |  |
| 5 | Query R-D5 again. | During outage: 5xx (e.g. 500/503) in the standard format, never 200; after restore R-D5 is still Issued; the retry returns 200 and R-D5 is Redeemed with the supplied date. |

### TC-055 - TGO - AC11 - Client Timeout Then Retry Produces Correct Final State
- **Req:** REQ-011, REQ-009 | **Condition:** TCOND-013 - If the caller times out after the server persisted, the retry is safe.
- **Type/Level/Technique/Category:** Negative / System / Error Guessing / Recovery
- **Priority/Severity/Risk/Automation:** 2 / High / High / Low
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Client with a configurable very short timeout (e.g. 1 ms) or a proxy that drops the response; Player P1 owns Issued receipt R-D6.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; Voided body for R-D6

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the Voided update for R-D6 with a client timeout that aborts before the response. |  |
| 2 | Retry the identical request with a normal timeout. |  |
| 3 | Query ModuleReceiptContent for R-D6. | Retry returns 200 or the approved already-applied result; R-D6 is Voided exactly once with the supplied date; no duplicate rows. |

### TC-056 - TGO - AC11 - Validation Errors Distinguished From Retryable Failures
- **Req:** REQ-011, REQ-010 | **Condition:** TCOND-013 - Caller can tell permanent 4xx rejections from transient 5xx failures.
- **Type/Level/Technique/Category:** Negative / Integration / Decision Table / Recovery
- **Priority/Severity/Risk/Automation:** 2 / Medium / Medium / Medium
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Ability to simulate a transient dependency failure; receipts for validation errors available.
- **Test Data:** Validation errors: TGO-CNT034, TGO-CNT038, TGO-CNT040; transient: DB unavailable

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Trigger each validation error and record the HTTP status. |  |
| 2 | Trigger the transient DB failure and record the HTTP status. | Validation errors return 4xx (400) with the TGO error code; transient failures return 5xx - so Trilogy retries only transient failures. |

### TC-057 - TGO - AC12 - List Availability Decision Table Setting Type Status
- **Req:** REQ-012 | **Condition:** TCOND-014 - Availability = f(Technical Setting, issuance type, status).
- **Type/Level/Technique/Category:** Positive / System / Decision Table / Functional
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / Medium
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns unexpired receipts: D-Issued, D-Redeemed, D-Voided (digital) and P-Issued, P-Redeemed, P-Voided (printed) - statuses set via this endpoint; list API (#1445171) deployed.
- **Test Data:** Technical Setting: Digital Only / All Receipts; 6 receipts above

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Set Technical Setting = Digital Only and call the list API for P1. |  |
| 2 | Set Technical Setting = All Receipts and call the list API for P1. | Digital Only -> only D-Issued returned. All Receipts -> only D-Issued and P-Issued returned. No Redeemed or Voided receipt appears in either response. |

### TC-058 - TGO - AC12 - Status Change Reflected On Very Next List Call
- **Req:** REQ-012 | **Condition:** TCOND-014 - Updated status is visible to the list API immediately after successful persistence (no stale cache).
- **Type/Level/Technique/Category:** Boundary / System / BVA / Functional
- **Priority/Severity/Risk/Automation:** 2 / High / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Technical Setting = All Receipts; Player P1 owns Issued printed receipt R-P3 listed by the list API.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; Redeemed body for R-P3; list API call issued immediately after the 200

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the Redeemed update for R-P3 and wait for the 200. |  |
| 2 | Immediately call the list API for P1. | R-P3 is not returned by the list call made immediately after the successful update. |

### TC-059 - TGO - AC12 - List Uses Local Status Without Calling Trilogy
- **Req:** REQ-012 | **Condition:** TCOND-014 - Connector evaluates availability without calling Trilogy.
- **Type/Level/Technique/Category:** Negative / Integration / Error Guessing / Recovery
- **Priority/Severity/Risk/Automation:** 2 / High / Medium / Low
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns receipts D-Issued and D-Redeemed; ability to block Connector->Trilogy traffic and inspect outbound calls/logs.
- **Test Data:** List API for P1 with Trilogy unreachable

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Block network access from Connector to Trilogy. |  |
| 2 | Call the list API for P1. |  |
| 3 | Inspect Connector outbound call logs. | List API returns 200 with D-Issued only (D-Redeemed excluded) while Trilogy is unreachable; no outbound call to Trilogy is attempted. |

### TC-060 - TGO - Wiki - Unsupported HTTP Methods Rejected
- **Req:** REQ-013 | **Condition:** TCOND-015 - Only the documented POST method updates status.
- **Type/Level/Technique/Category:** Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation:** 3 / Medium / Low / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipt R-D1.
- **Test Data:** /{siteId}/api/v1/player/receipt with PUT, PATCH, DELETE; status-update body for R-D1

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the status-update body with PUT. |  |
| 2 | Send it with PATCH. |  |
| 3 | Send DELETE to the route. |  |
| 4 | Query ModuleReceiptContent for R-D1. | Each unsupported method returns HTTP 405 (or the approved error) and R-D1 is unchanged/not deleted. |

### TC-061 - TGO - Wiki - Status Body On Shared Route Is Not Treated As Ingestion
- **Req:** REQ-013, REQ-015 | **Condition:** TCOND-015 - POST with the 3-field status body updates an existing receipt and does not create or reject as a duplicate ingestion.
- **Type/Level/Technique/Category:** Negative / Integration / Error Guessing / API
- **Priority/Severity/Risk/Automation:** 1 / High / High / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipt R-D2; ingestion and status update share POST /{siteId}/api/v1/player/receipt.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; status body {"receiptIdentifier":"<R-D2>","receiptStatus":"Voided","transactionDate":"<now UTC>"}; then full ingestion body for R-D2 with receiptStatus=Issued

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the 3-field status body for R-D2. |  |
| 2 | Send a full ingestion body for R-D2 with receiptStatus=Issued. |  |
| 3 | Query ModuleReceiptContent for R-D2. | Status body returns 200 (not TGO-CNT035 'Receipt already exists'); the ingestion body returns 400 TGO-CNT035 and does not reset R-D2 to Issued; R-D2 remains Voided in one row. AND verify response header: Content-Type = application/json |

### TC-062 - TGO - Wiki - Non-JSON Content-Type Rejected
- **Req:** REQ-013 | **Condition:** TCOND-015 - Only application/json requests are processed.
- **Type/Level/Technique/Category:** Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation:** 3 / Low / Low / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Player P1 owns Issued receipt R-D1.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; valid tenant/meta; Content-Type text/plain and application/xml with equivalent payloads

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request with Content-Type text/plain. |  |
| 2 | Send the request with Content-Type application/xml. |  |
| 3 | Query ModuleReceiptContent for R-D1. | Both return HTTP 415 or 400 in the standard format; R-D1 unchanged. |

### TC-063 - TGO - Refinement - Transaction Date Within 5 Minute Offset Accepted
- **Req:** REQ-014 | **Condition:** TCOND-016 - transactionDate up to 5 minutes ahead of server time is accepted (clock-skew offset).
- **Type/Level/Technique/Category:** Boundary / Integration / BVA / API
- **Priority/Severity/Risk/Automation:** 2 / Medium / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Server clock synchronized and known; Player P1 owns Issued receipts R-F1 and R-F2 with expirationDate well in the future. Offset semantics to be confirmed with Dev (see Ambiguous Requirements).
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; R-F1 transactionDate = server now + 4m59s; R-F2 transactionDate = server now + 5m00s

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send Redeemed for R-F1 with now + 4m59s. |  |
| 2 | Send Redeemed for R-F2 with now + 5m00s. |  |
| 3 | Query both rows. | Both return HTTP 200 and store the supplied dates. AND verify response header: Content-Type = application/json |

### TC-064 - TGO - Refinement - Transaction Date Beyond 5 Minute Offset Rejected
- **Req:** REQ-014, REQ-010 | **Condition:** TCOND-016 - transactionDate more than 5 minutes in the future is rejected.
- **Type/Level/Technique/Category:** Boundary / Integration / BVA / API
- **Priority/Severity/Risk/Automation:** 2 / Medium / Medium / High
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Server clock synchronized; Player P1 owns Issued receipt R-F3 with expirationDate well in the future. Offset semantics to be confirmed with Dev.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; transactionDate = server now + 5m01s and now + 1 day

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send Redeemed for R-F3 with now + 5m01s. |  |
| 2 | Send Redeemed for R-F3 with now + 1 day. |  |
| 3 | Query R-F3. | Both return HTTP 400 standard error for an invalid transaction date; R-F3 remains Issued. AND verify response header: Content-Type = application/json |

### TC-065 - TGO - Scope - Status Update Sends No Notification Or EPG Call
- **Req:** REQ-015 | **Condition:** TCOND-017 - Status updates do not trigger email/SMS/push notifications or EPG calls.
- **Type/Level/Technique/Category:** Negative / Integration / Error Guessing / Functional
- **Priority/Severity/Risk/Automation:** 3 / Medium / Medium / Low
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). Access to notification service logs/outbox and outbound Connector call logs; Player P1 owns Issued receipt R-D3 with a registered email/phone.
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; Redeemed body for R-D3

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the Redeemed update for R-D3. |  |
| 2 | Inspect notification outbox/logs for P1. |  |
| 3 | Inspect Connector outbound calls for EPG endpoints. | Update returns 200; no email/SMS/push is queued for P1 and no EPG call is made as a result of the update. |

### TC-066 - TGO - E2E - CXP Redemption Propagates Redeemed Status To Connector
- **Req:** REQ-016, REQ-006 | **Condition:** TCOND-018 - Redeeming an offer receipt through CXP makes Trilogy call Connector and the receipt disappears from the mobile list.
- **Type/Level/Technique/Category:** Positive / UAT / EP / Functional
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / Low
- **Preconditions:** QA environment with Trilogy (incl. #1470269 caller), CXP and Connector integrated; Player P1 has an Issued, unexpired digital offer receipt R-O1 visible in the receipt-list API.
- **Test Data:** Player P1; receipt R-O1; CXP redemption

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Redeem R-O1 for P1 at CXP. |  |
| 2 | Check Trilogy integration logs for the Connector status call. |  |
| 3 | Query ModuleReceiptContent for R-O1. |  |
| 4 | Call the receipt-list API for P1. | Trilogy calls Connector with R-O1, status Redeemed and the actual redemption date/time; Connector returns 200; R-O1 is Redeemed with that date and no longer listed. |

### TC-067 - TGO - E2E - Void In Trilogy Propagates Voided Status To Connector
- **Req:** REQ-016, REQ-007 | **Condition:** TCOND-018 - Voiding a printed receipt in Trilogy propagates Voided to Connector and removes it from the list.
- **Type/Level/Technique/Category:** Positive / UAT / EP / Functional
- **Priority/Severity/Risk/Automation:** 1 / Critical / High / Low
- **Preconditions:** QA environment with Trilogy and Connector integrated; Technical Setting = All Receipts; Player P1 has an Issued, unexpired printed kiosk receipt R-K1 visible in the list API.
- **Test Data:** Player P1; receipt R-K1; void performed in Trilogy

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Void R-K1 in Trilogy. |  |
| 2 | Check Trilogy integration logs for the Connector status call. |  |
| 3 | Query ModuleReceiptContent for R-K1. |  |
| 4 | Call the receipt-list API for P1. | Trilogy calls Connector with R-K1, status Voided and the void date; R-K1 is Voided with that date and no longer listed. |

### TC-068 - TGO - E2E - Connector Unavailable During CXP Redemption Then Recovers
- **Req:** REQ-016, REQ-011 | **Condition:** TCOND-018 - Redemption succeeds at CXP even when Connector is down; status converges after retry/recovery.
- **Type/Level/Technique/Category:** Negative / System / Error Guessing / Recovery
- **Priority/Severity/Risk/Automation:** 2 / High / High / Low
- **Preconditions:** QA environment with Trilogy, CXP and Connector integrated; ability to stop the Connector Content Service; Player P1 has Issued receipt R-O2.
- **Test Data:** Player P1; receipt R-O2

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Stop the Connector Content Service. |  |
| 2 | Redeem R-O2 at CXP. |  |
| 3 | Check Trilogy integration logs. |  |
| 4 | Restart the Content Service and allow Trilogy retry (or trigger the retry path). |  |
| 5 | Query R-O2 and call the list API. | CXP redemption completes; Trilogy logs the failed call; after recovery R-O2 ends Redeemed with the original redemption date and is excluded from the list. If no retry occurs, raise as an integration gap (see Missing Requirements). |

### TC-069 - TGO - NFR - Sustained Status Update Throughput
- **Req:** REQ-001, REQ-011 | **Condition:** TCOND-013 - Endpoint sustains expected Trilogy update volume without errors or degradation.
- **Type/Level/Technique/Category:** Boundary / System / EP / Performance
- **Priority/Severity/Risk/Automation:** 3 / Medium / Medium / Medium
- **Preconditions:** Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; status-update endpoint POST /{siteId}/api/v1/player/receipt reachable; caller holds a valid x-evri-tenantid for the tenant and a valid x-evri-meta identifying the site and player; read access to the ModuleReceiptContent database for verification; test receipts pre-created via the ingestion API (#1445168 / #1365562). 1,000 Issued receipts across 100 players pre-ingested; load tool available; SLA to be confirmed (see Missing Requirements).
- **Test Data:** POST /{siteId}/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for player>, Content-Type=application/json; 1,000 unique Redeemed/Voided updates over 10 minutes, then a 5x spike for 1 minute

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Run the sustained load of 1,000 unique updates over 10 minutes. |  |
| 2 | Run a 1-minute spike at 5x the rate. |  |
| 3 | Verify all 1,000 receipts in ModuleReceiptContent. | No 5xx errors; p95 latency within the agreed SLA; every receipt has the expected final status and date. |


