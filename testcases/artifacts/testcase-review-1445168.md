# Test Case Review - #1445168 Enhance and Version Receipt Content Ingestion API

> Phase: development (baseline) | run_mode: dry-run | output_mode: excel | No ADO writes performed.

## Intake Summary
```
Resolved Story ID     : 1445168
Resolved Story Title  : Enhance and Version Receipt Content Ingestion API
Project               : Loyalty Kiosk (Area: Loyalty Kiosk\Trilogy Cloud Solutions\TGO; Iteration: Sprint 174 - Ending 10.6.2026; State: Ready for QA)
Parent                : 1320913 (P1 - TGO - Mobile Offers + Digital Receipts)
Children Reviewed     : 5 (1485324, 1487622, 1487623, 1487216, 1488362 - dev/QA tasks, no additional constraints)
Related Reviewed      : 1470255 (Successor - Trilogy caller), 1477501/1477505/1477507 (Removed), 1477502, 1477504 (voucher tasks)
Comments              : 2 (#13582204 wiki link; #13585124 QA observations: no-signature success, meta format, invalid meta w/o ;, tenant vs meta codes)
Attachment IDs Found  : 618ea8c4-3589-4049-8839-93db9ce27bfa (image.png - Content Service error catalogue CNT014/CNT027), 86322ade-d2d9-4b18-ab78-d924ffd78592 (image.png - earlier wiki table with combined CNT027 tenant/meta)
Local Docs Reviewed   : 0
Feature/Spec Files    : 0
Wiki Pages            : Receipt Content Ingestion & Status Update API (190936); Error Codes - Content Service (169844)
Reference Repo URL    : n/a (PR 186702 trilogy-go-connector linked; source not configured, not read)
Test Instance URL     : n/a
UI Exploration        : not enabled
Mobile Exploration    : not enabled
Unresolved Artifacts  : 1 (PR 186702 source code - source_repo_url not configured)
```

## Requirements
| Req | Source | Text |
|---|---|---|
| REQ-001 | [Work Item AC] AC1 | Endpoint accepts fully generated receipt HTML from Trilogy without receipt variables, associates it with property, player, receipt and module identifiers, and rejects missing/invalid HTML with the standard validation response. |
| REQ-002 | [Work Item AC] AC2; Description 'Required request data' | Request supports all fields required to store/display/list/deliver/update the receipt; required fields validated before acceptance; each Receipt ID identifies one receipt; multi-receipt offers supply one Receipt ID per receipt. |
| REQ-003 | [Work Item AC] AC3 | Request identifies issuance type (Digital \| Printed); both share common identification/lifecycle fields; type is passed to storage and receipt-list processing; printed never classified as digitally delivered. |
| REQ-004 | [Work Item AC] AC4; Description | Printed receipt HTML + metadata accepted (including deliveryMethod None), handed to Loyalty Cloud storage, and does not automatically trigger email or SMS; visible in receipt list only under Technical Setting 'All Receipts'. |
| REQ-005 | [Work Item AC] AC5 | Digital receipt can request Email, SMS, Both or None; requested delivery method is passed to downstream notification processing. |
| REQ-006 | [Work Item AC] AC6 | Request supports receipt status Issued/Redeemed/Voided, status transaction date and expiration date; invalid statuses or dates are rejected. |
| REQ-007 | [Work Item AC] AC7 | Existing supported promotion-receipt integrations keep working; incompatible changes require a new API version; callers are not forced onto an incompatible contract. |
| REQ-008 | [Work Item AC] AC8 | Request identifies the source Trilogy module; no Venetian-specific processing; supports OfferMaker, legacy promotions and other enabled modules; participation controlled by enablement configuration. |
| REQ-009 | [Work Item AC] AC9 | Valid request handed to #1365562 storage; approved success response only after acceptance; no success when validation fails; failures carry correlation information. |
| REQ-010 | Wiki: Receipt Content Ingestion & Status Update API | Route /{siteId}/api/v1/player/receipt (POST) with required headers x-evri-meta and x-evri-tenantid; documented responses 200, TGO-CNT014 Invalid Tenant, TGO-CNT027 Invalid Meta, TGO-CNT035 Receipt already exists, TGO-CNT040 transaction date after expiration, TGO-CNT034 missing required fields. |
| REQ-011 | Comment #13585124 (QA observations, 2026-09-29) | Requests must be authenticated (success observed without Signature); x-evri-meta format must be confirmed ('PlayerId;' vs 'PlayerId;ModuleIdentifier;ModuleRecordIdentifier'); meta without ';' returns invalid meta; Invalid Tenant and Invalid Meta must return distinct error codes. |
| REQ-012 | Wiki: Receipt Content Ingestion & Status Update API (shared route) | Ingestion and status update (#1445170) share POST /{siteId}/api/v1/player/receipt; an ingestion request must never be processed as a status update and vice versa. |
| REQ-013 | [Work Item AC] Dependencies and boundaries | This item does not send notifications and does not return the player's receipt list; storage (#1365562), notifications (#1349857) and list (#1445171) consume the accepted data. |
| REQ-014 | Description; AC9 (implied NFR) | Ingestion is reliable under concurrency/retries and dependency failures, performs acceptably at Trilogy volumes, and logs accepted/rejected requests with correlation info without leaking sensitive content. |
| REQ-015 | Parent Feature #1320913; Successor #1470255 | End-to-end: a Trilogy/OfferMaker receipt generated at the kiosk (digital or printed) is ingested into Connector and becomes available to downstream storage/list services. |

## Requirement Analysis
### Business Rules
- BR-1: Trilogy sends fully generated, translated receipt HTML; Connector never constructs HTML or needs receipt variables (AC1).
- BR-2: One Receipt ID = one receipt; an offer producing N receipts sends N distinct Receipt IDs (AC2).
- BR-3: A Receipt ID that already exists is rejected with TGO-CNT035 (Wiki).
- BR-4: issuanceType is Digital or Printed; a Printed receipt is never treated as digitally delivered (AC3).
- BR-5: Printed receipts may use deliveryMethod None and never auto-trigger email/SMS (AC4).
- BR-6: deliveryMethod is Email, SMS, Both or None and is passed to notification processing (AC5).
- BR-7: receiptStatus is Issued, Redeemed or Voided; transactionDate must not be after expirationDate (AC6, Wiki TGO-CNT040).
- BR-8: Printed receipts are returned by the receipt-list API only when the property's Technical Setting is 'All Receipts' (Description).
- BR-9: Module participation is controlled by enablement configuration; no property-specific (Venetian) logic (AC8).
- BR-10: Success is returned only after the receipt is accepted for storage; validation failures never return success (AC9).

### Functional Requirements
- Authenticated POST /{siteId}/api/v1/player/receipt with x-evri-tenantid and x-evri-meta headers.
- Required-field validation (receiptIdentifier, moduleIdentifier, templateName, receiptHtml, issuanceType, deliveryMethod, receiptStatus, transactionDate, expirationDate) -> TGO-CNT034.
- Enumerated value validation for issuanceType, deliveryMethod, receiptStatus.
- Date validation and transactionDate <= expirationDate rule.
- Duplicate Receipt ID rejection (TGO-CNT035).
- Hand-off of accepted receipt (HTML + metadata + issuance type + delivery method) to storage #1365562.
- Backward compatibility / API versioning of the existing receipt/Distribute Voucher integration.

### Non Functional Requirements
- Security: tenant/meta/signature authentication, tenant and player isolation, injection resistance, no sensitive data in errors/logs.
- Reliability/Recovery: no false success, retry-safe (duplicate retries do not create a second receipt), concurrency-safe.
- Performance: sustained ingestion throughput and large-HTML payloads (SLA and max size not specified).
- Supportability: correlation information on failures; auditable request outcomes.

### Dependencies
- #1365562 Store Player Receipt Content and Metadata (persists receipt, creates short Receipt URL).
- #1349857 Prepare and Deliver Digital Receipt Notifications (consumes deliveryMethod).
- #1445171 Expose Player Receipt List API (consumes issuance type, status, metadata; Technical Setting Digital Only / All Receipts).
- #1445170 Receipt Status Update (shares the same route).
- #1470255 Post Redeem Offer - Ingest Player Receipt to TCS (Trilogy caller).
- Module enablement configuration; Content Service error-code catalogue (Wiki 169844).

### Constraints
- Single route /{siteId}/api/v1/player/receipt, v1, POST, shared with status update.
- Player identity is carried by x-evri-meta; property by {siteId} and x-evri-tenantid (no playerId/propertyId in the documented body).
- This item does not persist directly, send notifications, or return the receipt list (per AC boundaries).

### Assumptions
- All documented body fields except description are required (wiki sample shows description as "").
- Enum values are case-sensitive as documented: Digital/Printed, Email/SMS/Both/None, Issued/Redeemed/Voided.
- transactionDate equal to expirationDate is accepted; only strictly-after returns TGO-CNT040 (same as #1445170 baseline).
- Validation errors not listed in the wiki (invalid enum, invalid HTML, invalid date format) return 400 in the standard Connector error format; the exact code is to be confirmed.
- x-evri-meta 'PlayerId;' is the currently implemented format pending Dev confirmation (Comment #13585124).
- Receipt ID uniqueness scope is per tenant/site (to be confirmed).

### Test Conditions
| ID | Req | Condition | Risk |
|---|---|---|---|
| TCOND-001 | REQ-001 | Full receipt HTML accepted, stored verbatim and associated with site, player, receipt and module identifiers. | High |
| TCOND-002 | REQ-001 | Missing, empty, invalid or oversized receipt HTML rejected with the standard validation response. | High |
| TCOND-003 | REQ-002 | Required metadata validated before acceptance; no partial records on failure. | High |
| TCOND-004 | REQ-002 | Receipt ID uniqueness and one-ID-per-receipt for multi-receipt offers. | High |
| TCOND-005 | REQ-002 | Field type, length and extra-field boundaries. | Medium |
| TCOND-006 | REQ-003 | Issuance type Digital/Printed accepted, stored and propagated; invalid values rejected. | High |
| TCOND-007 | REQ-003 | Printed receipt never classified as digital; list visibility follows Technical Setting. | High |
| TCOND-008 | REQ-004 | Printed receipt with deliveryMethod None accepted, stored, and no email/SMS triggered. | High |
| TCOND-009 | REQ-005 | Delivery methods Email/SMS/Both/None accepted and propagated; invalid values rejected. | High |
| TCOND-010 | REQ-006 | Status values Issued/Redeemed/Voided accepted; invalid values rejected. | High |
| TCOND-011 | REQ-006 | Transaction/expiration date validity, precision, timezone and ordering (TGO-CNT040). | High |
| TCOND-012 | REQ-007 | Existing promotion-receipt integrations unaffected; versioning rules honoured. | High |
| TCOND-013 | REQ-008 | Module identification, module enablement and property-agnostic processing. | Medium |
| TCOND-014 | REQ-009 | Hand-off to storage; success only after acceptance; no false success; correlation info on failure. | High |
| TCOND-015 | REQ-010 | Tenant/meta headers, site scoping and documented error codes honoured. | High |
| TCOND-016 | REQ-011 | Signature authentication enforced; meta format variants; distinct tenant vs meta errors. | High |
| TCOND-017 | REQ-012 | Shared route never confuses ingestion with status update. | Medium |
| TCOND-018 | REQ-013 | Ingestion itself sends no notification and returns no receipt list. | Low |
| TCOND-019 | REQ-014 | Concurrency, retry, dependency outage, throughput and logging behaviour. | Medium |
| TCOND-020 | REQ-015 | Kiosk redemption in Trilogy results in a stored, listable receipt in Loyalty Cloud. | High |

## Coverage Summary
- **by_type**: Positive: 24, Negative: 39, Boundary: 9
- **by_level**: Component: 2, Integration: 62, System: 6, UAT: 2
- **by_category**: Functional: 18, Security: 11, Performance: 1, Recovery: 3, API: 33, Database: 6
- **by_technique**: EP: 39, BVA: 9, Decision Table: 4, Error Guessing: 20
- **Total cases**: 72
- **Examples 1:1 mapping**: n/a (no SpecFlow Examples provided) - confirmed true

## Requirements Traceability Matrix
| Req | Test Conditions | Test Cases | Levels | Techniques | Covered |
|---|---|---|---|---|---|
| REQ-001 | TCOND-001, TCOND-002, TCOND-020 | TC-001, TC-002, TC-003, TC-004, TC-005, TC-006, TC-007, TC-070 | Integration, UAT | EP, BVA, Error Guessing | True |
| REQ-002 | TCOND-003, TCOND-004, TCOND-005, TCOND-001, TCOND-017, TCOND-019 | TC-001, TC-008, TC-009, TC-010, TC-011, TC-012, TC-013, TC-014, TC-015, TC-016, TC-017, TC-065, TC-067 | Integration | EP, BVA, Error Guessing | True |
| REQ-003 | TCOND-006, TCOND-007, TCOND-020 | TC-018, TC-019, TC-020, TC-021, TC-022, TC-023, TC-024, TC-071 | Integration, System, Component, UAT | EP, BVA, Error Guessing, Decision Table | True |
| REQ-004 | TCOND-008, TCOND-006, TCOND-007, TCOND-020 | TC-018, TC-022, TC-023, TC-025, TC-026, TC-027, TC-071 | Integration, System, UAT | EP, Error Guessing, Decision Table | True |
| REQ-005 | TCOND-009, TCOND-008, TCOND-020 | TC-027, TC-028, TC-029, TC-030, TC-031, TC-032, TC-033, TC-070 | Integration, UAT | Decision Table, EP | True |
| REQ-006 | TCOND-010, TCOND-011, TCOND-005 | TC-016, TC-034, TC-035, TC-036, TC-037, TC-038, TC-039, TC-040 | Integration | EP, BVA | True |
| REQ-007 | TCOND-012 | TC-041, TC-042, TC-043 | System, Integration | EP, Error Guessing | True |
| REQ-008 | TCOND-013 | TC-044, TC-045, TC-046, TC-047, TC-048 | Integration, System | EP, Decision Table | True |
| REQ-009 | TCOND-014, TCOND-003, TCOND-006, TCOND-008, TCOND-009, TCOND-019, TCOND-020 | TC-010, TC-019, TC-025, TC-032, TC-049, TC-050, TC-051, TC-052, TC-069, TC-072 | Integration, System | Error Guessing, EP, Decision Table | True |
| REQ-010 | TCOND-015, TCOND-001, TCOND-002, TCOND-003, TCOND-004, TCOND-005, TCOND-011, TCOND-012, TCOND-016, TCOND-017 | TC-001, TC-003, TC-008, TC-011, TC-013, TC-014, TC-017, TC-036, TC-037, TC-042, TC-043, TC-053, TC-054, TC-055, TC-056, TC-058, TC-059, TC-060, TC-061, TC-062, TC-063, TC-064 | Integration | EP, Error Guessing, BVA | True |
| REQ-011 | TCOND-016 | TC-056, TC-057, TC-058 | Integration | BVA, Error Guessing, EP | True |
| REQ-012 | TCOND-017 | TC-064, TC-065 | Integration | Error Guessing | True |
| REQ-013 | TCOND-018, TCOND-008 | TC-026, TC-066 | Integration, Component | EP | True |
| REQ-014 | TCOND-019, TCOND-002, TCOND-014, TCOND-015 | TC-006, TC-007, TC-050, TC-051, TC-052, TC-061, TC-067, TC-068, TC-069 | Integration, System | BVA, Error Guessing, EP | True |
| REQ-015 | TCOND-020 | TC-070, TC-071, TC-072 | UAT, System | EP, Error Guessing | True |

## Risk Coverage Summary
- By rating: High 45, Medium 24, Low 3
- High-risk requirements: 

## Missing Requirements
- Signature/authorization requirement for the ingestion API is not documented in the wiki (QA observed success without Signature - Comment #13585124).
- Final x-evri-meta format ('PlayerId;' vs 'PlayerId;ModuleIdentifier;ModuleRecordIdentifier') not confirmed.
- Error codes for invalid enum values, invalid receipt HTML, invalid date formats, unknown module and disabled module are not listed for this API.
- Maximum receiptHtml size and receiptIdentifier length are not specified.
- 'Existing contact and transaction identifiers required by the current integration' (Description) are not present in the documented request body.
- Performance SLA / expected ingestion volume not specified.
- Legacy (pre-2.8.0) contract and its caller list are not documented, so the AC7 compatibility review evidence is unavailable.

## Ambiguous Requirements
| Req | Issue | Assumption Made |
|---|---|---|
| REQ-001 | 'Invalid receipt HTML' is not defined (plain text? malformed markup? script content?). | Non-string values are rejected; string validity follows the approved definition - TC-005/TC-007 record actual behaviour. |
| REQ-002 | Which body fields are mandatory (description shown as empty in the wiki sample) and the Receipt ID uniqueness scope. | All fields except description are required; uniqueness is per tenant/site. |
| REQ-004 | Whether a Printed receipt may carry deliveryMethod Email/SMS/Both. | Either rejected or accepted without auto-notification (TC-027). |
| REQ-006 | Whether transactionDate equal to expirationDate is valid, and whether an already-past expirationDate is accepted at ingestion. | Equal is accepted; past expiration handled per approved rule (TC-037, TC-039). |
| REQ-009 | AC boundary says this item 'does not persist the receipt directly' while the wiki shows the API writing to ModuleReceiptContent. | DB verification of ModuleReceiptContent is used as the storage hand-off evidence. |
| REQ-011 | Precedence when both tenant and meta are invalid. | Tenant validation first (TGO-CNT014). |
| REQ-003 | Case sensitivity of enum values (issuanceType, deliveryMethod, receiptStatus). | Documented casing is canonical; variants rejected or normalised consistently. |

## Additional Exploratory Test Ideas
- Charter: explore receipts in right-to-left languages and very long single-line HTML to find storage/rendering issues in the hosted receipt.
- Charter: ingest receipts with HTML referencing external images/CSS that are later unavailable and observe the Receipt URL rendering.
- Charter: rapidly alternate module enable/disable while Trilogy is sending receipts to find race conditions.
- Charter: ingest then immediately status-update (#1445170) the same receipt within milliseconds to probe ordering on the shared route.
- Charter: compare receipt content stored for the same offer across languages configured on the kiosk.
- Charter: replay a captured valid request after tenant credentials rotate to probe stale-credential acceptance.

## Warnings
- Config user_story_title_keywords ('TGO - Updating the status and transaction details of existing receipts') and excel.output_file_basename ('TGO_1445170_TestCases') refer to #1445170, but user_story_id is 1445168 (title 'Enhance and Version Receipt Content Ingestion API'). The ID was used; the Excel was written as TGO_1445168_TestCases.xlsx to avoid overwriting the #1445170 workbook.
- QA Comment #13585124 reports success without Signature authentication - TC-057 expects rejection; log a defect if still reproducible.
- Error codes not documented for this API (invalid enum/HTML/date, module errors, signature) reference the Content Service catalogue (Wiki 169844) as expected values - confirm with Dev before execution.
- Receipt IDs such as R-D1/R-P1 and site/player/offer identifiers (S1, P1, O1) are placeholders to be created during test setup; no real IDs were fabricated.
- Comment image 2 (older wiki) showed a combined 'Invalid Meta / Invalid Tenant' TGO-CNT027 row; the current wiki now lists TGO-CNT014 and TGO-CNT027 separately - TC-058 verifies the implementation matches.

## Test Cases
### TC-001 - TGO - AC1 - Digital Receipt With Full HTML Ingested Returns 200
- **Req**: REQ-001, REQ-002, REQ-010 | **Condition**: TCOND-001 Full receipt HTML accepted, stored verbatim and associated with site, player, receipt and module identifiers.
- **Type/Level/Technique/Category**: Positive / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 1 / Critical / High / High
- **Source**: [Work Item AC] AC1; Wiki
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Receipt ID R-D1 does not exist.
- **Test Data**: POST /S1/api/v1/player/receipt; headers x-evri-tenantid=<valid tenant>, x-evri-meta=<valid meta for P1, e.g. 1234787;>, Content-Type=application/json; body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with receiptIdentifier=R-D1

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the POST request with valid headers and the full body for R-D1. |  |
| 2 | Query ModuleReceiptContent for R-D1 (site, player, moduleIdentifier, templateName, description, receiptHtml, issuanceType, deliveryMethod, receiptStatus, transactionDate, expirationDate). | HTTP 200 'Receipt ingested successfully.'; exactly one row exists for R-D1 linked to site S1, player P1 (from x-evri-meta) and the supplied moduleIdentifier, with every body field stored as sent. AND verify response header: Content-Type = application/json |

### TC-002 - TGO - AC1 - Receipt HTML Stored Verbatim Without Variable Substitution
- **Req**: REQ-001 | **Condition**: TCOND-001 Full receipt HTML accepted, stored verbatim and associated with site, player, receipt and module identifiers.
- **Type/Level/Technique/Category**: Positive / Integration / EP / Database
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC1; Description
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with receiptHtml = '<html><body><h1>Recibo</h1><p>Bienvenido José – ¡Gracias! 100% €5.00</p><p>{PlayerName} {{OfferValue}}</p><img src="https://cdn.example/logo.png"/></body></html>' (translated text, UTF-8 characters, literal brace tokens)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request with the translated, UTF-8 HTML containing literal brace tokens. |  |
| 2 | Read receiptHtml for the receipt from ModuleReceiptContent and compare it byte-for-byte with the request value. |  |
| 3 | Check the request/response and Connector logs for any variable resolution or template rendering activity. | HTTP 200 'Receipt ingested successfully.'; stored receiptHtml is identical to the input (no encoding loss of José/¡/€, literal {PlayerName} and {{OfferValue}} left untouched, no HTML escaping or rewriting); Connector performs no variable lookup or HTML construction. AND verify response header: Content-Type = application/json |

### TC-003 - TGO - AC1 - Missing receiptHtml Returns TGO-CNT034
- **Req**: REQ-001, REQ-010 | **Condition**: TCOND-002 Missing, empty, invalid or oversized receipt HTML rejected with the standard validation response.
- **Type/Level/Technique/Category**: Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC1; Wiki TGO-CNT034
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with the receiptHtml property removed

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request without the receiptHtml property. |  |
| 2 | Query ModuleReceiptContent for the receiptIdentifier used. | HTTP 400 Bad Request in the standard Connector error format (errorCode + message) with errorCode TGO-CNT034 (missing required fields) naming receiptHtml; no row is created in ModuleReceiptContent and nothing is handed to storage/notification processing. AND verify response header: Content-Type = application/json |

### TC-004 - TGO - AC1 - Empty Whitespace And Null receiptHtml Rejected
- **Req**: REQ-001 | **Condition**: TCOND-002 Missing, empty, invalid or oversized receipt HTML rejected with the standard validation response.
- **Type/Level/Technique/Category**: Boundary / Integration / BVA / API
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC1
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with receiptHtml = "" | "   " | null (new receiptIdentifier per request)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request with receiptHtml = "". |  |
| 2 | Send the request with receiptHtml = "   " (whitespace only). |  |
| 3 | Send the request with receiptHtml = null. |  |
| 4 | Query ModuleReceiptContent for the three receiptIdentifiers. | Each request returns HTTP 400 Bad Request in the standard Connector error format (errorCode + message) (TGO-CNT034 or the approved validation code) - never 200; no rows exist for any of the three receipt IDs. AND verify response header: Content-Type = application/json |

### TC-005 - TGO - AC1 - Invalid Or Non-HTML receiptHtml Rejected
- **Req**: REQ-001 | **Condition**: TCOND-002 Missing, empty, invalid or oversized receipt HTML rejected with the standard validation response.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / API
- **Priority/Severity/Risk/Automation**: 2 / High / High / High
- **Source**: [Work Item AC] AC1
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: receiptHtml variants: 'Thank you' (plain text) | '<html><body><p>unclosed' (malformed) | 'PGh0bWw+' (base64) | {"html":"<p>x</p>"} (object) | ["<p>x</p>"] (array)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send one ingestion request per invalid receiptHtml variant, each with a new receiptIdentifier. |  |
| 2 | Record status code and error body for each response. |  |
| 3 | Query ModuleReceiptContent for the receipt IDs used. | Object/array values are rejected with HTTP 400 Bad Request in the standard Connector error format (errorCode + message); plain text/malformed/base64 values are handled per the approved definition of 'invalid receipt HTML' (rejected with the standard validation response, never a 5xx); no row exists for any rejected request. AND verify response header: Content-Type = application/json |

### TC-006 - TGO - AC1 - Large Receipt HTML Size Boundaries
- **Req**: REQ-001, REQ-014 | **Condition**: TCOND-002 Missing, empty, invalid or oversized receipt HTML rejected with the standard validation response.
- **Type/Level/Technique/Category**: Boundary / Integration / BVA / API
- **Priority/Severity/Risk/Automation**: 2 / Medium / Medium / High
- **Source**: [Work Item AC] AC1; Description
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Maximum accepted request/HTML size confirmed with Dev (not documented).
- **Test Data**: receiptHtml sizes: 1 KB, 100 KB, 1 MB, configured max, max + 1 byte (new receiptIdentifier each)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send ingestion requests with receiptHtml of 1 KB, 100 KB and 1 MB. |  |
| 2 | Send a request with receiptHtml exactly at the configured maximum size. |  |
| 3 | Send a request with receiptHtml one byte over the maximum size. |  |
| 4 | Compare stored receiptHtml length with the sent length for accepted requests. | Requests up to and including the maximum return HTTP 200 'Receipt ingested successfully.' and store the full HTML without truncation; max + 1 returns a controlled 4xx (400/413) in the standard error format - never a 5xx or a silently truncated record. AND verify response header: Content-Type = application/json |

### TC-007 - TGO - AC1 - Script And Event Handler Content In receiptHtml Handled Safely
- **Req**: REQ-001, REQ-014 | **Condition**: TCOND-002 Missing, empty, invalid or oversized receipt HTML rejected with the standard validation response.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / Security
- **Priority/Severity/Risk/Automation**: 2 / High / Medium / Medium
- **Source**: [Work Item AC] AC1; Error Guessing
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: receiptHtml = '<html><body><script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)">x</a></body></html>'

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request with the script-bearing receiptHtml. |  |
| 2 | Inspect the response and Connector logs. |  |
| 3 | If accepted, open the stored receipt through the short Receipt URL (#1365562) in a browser. | Request is either rejected with the standard validation response or accepted per the approved content policy; no server error, the payload is not executed server-side, and the hosted receipt does not execute script in the player's browser (sanitised or CSP-blocked) - otherwise log a defect. |

### TC-008 - TGO - AC2 - Each Required Field Missing Returns TGO-CNT034
- **Req**: REQ-002, REQ-010 | **Condition**: TCOND-003 Required metadata validated before acceptance; no partial records on failure.
- **Type/Level/Technique/Category**: Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC2; Wiki TGO-CNT034
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with exactly one field removed per request (new receiptIdentifier per request except step 1)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request without receiptIdentifier. |  |
| 2 | Send the request without moduleIdentifier. |  |
| 3 | Send the request without templateName. |  |
| 4 | Send the request without issuanceType. |  |
| 5 | Send the request without deliveryMethod. |  |
| 6 | Send the request without receiptStatus. |  |
| 7 | Send the request without transactionDate. |  |
| 8 | Send the request without expirationDate. |  |
| 9 | Query ModuleReceiptContent for all receipt IDs used. | Every request returns HTTP 400 Bad Request in the standard Connector error format (errorCode + message) with errorCode TGO-CNT034 and a message identifying the missing field; no row is created in ModuleReceiptContent and nothing is handed to storage/notification processing for any of the requests. AND verify response header: Content-Type = application/json |

### TC-009 - TGO - AC2 - Optional Description Empty Or Absent Accepted
- **Req**: REQ-002 | **Condition**: TCOND-003 Required metadata validated before acceptance; no partial records on failure.
- **Type/Level/Technique/Category**: Boundary / Integration / BVA / API
- **Priority/Severity/Risk/Automation**: 3 / Low / Low / High
- **Source**: [Work Item AC] AC2; Wiki sample body
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with description = "" (request A) and description omitted (request B)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send request A with description = "". |  |
| 2 | Send request B without the description property. |  |
| 3 | Query ModuleReceiptContent for both receipts. | Both return HTTP 200 'Receipt ingested successfully.' (description is optional per wiki sample) and are stored with an empty/null description; if the contract makes description mandatory, request B returns TGO-CNT034 - confirm and record. AND verify response header: Content-Type = application/json |

### TC-010 - TGO - AC2 - Validation Runs Before Acceptance With No Partial Record
- **Req**: REQ-002, REQ-009 | **Condition**: TCOND-003 Required metadata validated before acceptance; no partial records on failure.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / Database
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC2; AC9
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Notification queue/records for #1349857 observable.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with valid receiptHtml but issuanceType = "Unknown" and transactionDate after expirationDate

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Note the current row count in ModuleReceiptContent for player P1. |  |
| 2 | Send the ingestion request containing multiple validation errors. |  |
| 3 | Re-check the row count and search for the receiptIdentifier. |  |
| 4 | Check notification processing for any record for this receiptIdentifier. | HTTP 400 Bad Request in the standard Connector error format (errorCode + message) (single consistent error or list of errors) is returned; row count unchanged, no partially stored HTML/metadata, and no notification record is created. |

### TC-011 - TGO - AC2 - Duplicate receiptIdentifier Returns TGO-CNT035
- **Req**: REQ-002, REQ-010 | **Condition**: TCOND-004 Receipt ID uniqueness and one-ID-per-receipt for multi-receipt offers.
- **Type/Level/Technique/Category**: Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC2; Wiki TGO-CNT035
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Receipt R-D1 already ingested (TC-001).
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with receiptIdentifier=R-D1 and a different description/receiptHtml

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send a second ingestion request reusing receiptIdentifier R-D1 with different content. |  |
| 2 | Query ModuleReceiptContent for R-D1. | HTTP 400 Bad Request in the standard Connector error format (errorCode + message) with errorCode TGO-CNT035 'Receipt already exists'; the original R-D1 row is unchanged (content, status, dates) and no second row exists. AND verify response header: Content-Type = application/json |

### TC-012 - TGO - AC2 - Offer Producing Multiple Receipts Stores Each Receipt Individually
- **Req**: REQ-002 | **Condition**: TCOND-004 Receipt ID uniqueness and one-ID-per-receipt for multi-receipt offers.
- **Type/Level/Technique/Category**: Positive / Integration / EP / Functional
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC2; Description
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. An offer O1 configured to produce three receipts for P1.
- **Test Data**: Three requests with the same description/moduleIdentifier/templateName for offer O1 and receiptIdentifier R-M1, R-M2, R-M3 with distinct receiptHtml

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request for R-M1. |  |
| 2 | Send the ingestion request for R-M2. |  |
| 3 | Send the ingestion request for R-M3. |  |
| 4 | Query ModuleReceiptContent for player P1 and offer O1. | All three requests return HTTP 200 'Receipt ingested successfully.'; three separate rows exist (R-M1, R-M2, R-M3), each holding its own receiptHtml and metadata, with no merging or overwriting. AND verify response header: Content-Type = application/json |

### TC-013 - TGO - AC2 - Multi-Receipt Offer Reusing A Receipt ID Rejected
- **Req**: REQ-002, REQ-010 | **Condition**: TCOND-004 Receipt ID uniqueness and one-ID-per-receipt for multi-receipt offers.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / Functional
- **Priority/Severity/Risk/Automation**: 2 / High / High / High
- **Source**: [Work Item AC] AC2
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. R-M1 ingested for offer O1 (TC-012).
- **Test Data**: Second receipt of offer O1 sent with receiptIdentifier=R-M1 and different receiptHtml

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the second receipt of offer O1 reusing receiptIdentifier R-M1. |  |
| 2 | Query ModuleReceiptContent for R-M1. | HTTP 400 Bad Request in the standard Connector error format (errorCode + message) TGO-CNT035; R-M1 retains its original HTML - the second receipt is not merged into or overwriting the first. AND verify response header: Content-Type = application/json |

### TC-014 - TGO - AC2 - Same Receipt ID Under Another Tenant Or Player Is Isolated
- **Req**: REQ-002, REQ-010 | **Condition**: TCOND-004 Receipt ID uniqueness and one-ID-per-receipt for multi-receipt offers.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / Security
- **Priority/Severity/Risk/Automation**: 2 / High / High / High
- **Source**: [Work Item AC] AC2; Error Guessing
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. R-D1 exists for P1 on site S1; valid headers available for tenant/site S2 and player P2.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with receiptIdentifier=R-D1 sent (a) as P2 on S1 and (b) as P2 on S2

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request for R-D1 as player P2 on site S1. |  |
| 2 | Send the ingestion request for R-D1 as player P2 on site S2. |  |
| 3 | Query ModuleReceiptContent for R-D1 across sites/players. | Each request is accepted or rejected (TGO-CNT035) according to the approved Receipt ID uniqueness scope; in no case is P1's R-D1 row on S1 overwritten or re-associated to P2/S2. |

### TC-015 - TGO - AC2 - receiptIdentifier Length And Character Boundaries
- **Req**: REQ-002 | **Condition**: TCOND-005 Field type, length and extra-field boundaries.
- **Type/Level/Technique/Category**: Boundary / Integration / BVA / API
- **Priority/Severity/Risk/Automation**: 2 / Medium / Medium / High
- **Source**: [Work Item AC] AC2
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Max receiptIdentifier length (DB column) confirmed with Dev.
- **Test Data**: receiptIdentifier = 'A' (1 char) | max length | max + 1 | ' OFFR-R1 ' (padded) | 'OFFR/R#1?%' (special chars) | 'ÜNICODE-1'

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send ingestion requests with a 1-character and a max-length receiptIdentifier. |  |
| 2 | Send an ingestion request with a max + 1 length receiptIdentifier. |  |
| 3 | Send requests with padded, special-character and Unicode receiptIdentifiers. |  |
| 4 | Query ModuleReceiptContent for all accepted IDs. | 1-char and max-length IDs return HTTP 200 'Receipt ingested successfully.' and are stored exactly; max + 1 returns HTTP 400 Bad Request in the standard Connector error format (errorCode + message) (no truncation, no 5xx); padded/special/Unicode IDs are either stored exactly or rejected consistently per contract. AND verify response header: Content-Type = application/json |

### TC-016 - TGO - AC2 - Wrong Data Types Rejected
- **Req**: REQ-002, REQ-006 | **Condition**: TCOND-005 Field type, length and extra-field boundaries.
- **Type/Level/Technique/Category**: Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 2 / Medium / Medium / High
- **Source**: [Work Item AC] AC2
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: receiptIdentifier=12345 (number) | issuanceType=1 | deliveryMethod=true | transactionDate=1759344917 (epoch number) | expirationDate={} | templateName=["t"]

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send one ingestion request per wrong-type field value. |  |
| 2 | Record the status code and error body for each. |  |
| 3 | Query ModuleReceiptContent for the receipt IDs used. | Each request returns HTTP 400 Bad Request in the standard Connector error format (errorCode + message) identifying the invalid field (no 5xx, no stack trace); no rows stored. AND verify response header: Content-Type = application/json |

### TC-017 - TGO - AC2 - Unknown Body Fields Cannot Override Player Or Site
- **Req**: REQ-002, REQ-010 | **Condition**: TCOND-005 Field type, length and extra-field boundaries.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / Security
- **Priority/Severity/Risk/Automation**: 2 / High / Medium / High
- **Source**: [Work Item AC] AC2; Error Guessing
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Player P2 exists on site S1.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} plus extra properties "playerId":"<P2>", "siteId":"S2", "id":999

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request as P1 (x-evri-meta) with extra playerId/siteId/id properties in the body. |  |
| 2 | Query ModuleReceiptContent for the receiptIdentifier. | Request is either rejected (HTTP 400 Bad Request in the standard Connector error format (errorCode + message)) or accepted with extra fields ignored; the stored receipt belongs to P1 on S1 (from headers/route), never to P2/S2, and no client-supplied primary key is used. |

### TC-018 - TGO - AC3 - Printed Receipt Ingested With issuanceType Printed
- **Req**: REQ-003, REQ-004 | **Condition**: TCOND-006 Issuance type Digital/Printed accepted, stored and propagated; invalid values rejected.
- **Type/Level/Technique/Category**: Positive / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 1 / Critical / High / High
- **Source**: [Work Item AC] AC3; AC4
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Receipt ID R-P1 does not exist.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with receiptIdentifier=R-P1, issuanceType="Printed", deliveryMethod="None"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request for printed receipt R-P1. |  |
| 2 | Query ModuleReceiptContent for R-P1. | HTTP 200 'Receipt ingested successfully.'; R-P1 is stored with issuanceType=Printed, deliveryMethod=None, receiptHtml and all common identification/lifecycle fields. AND verify response header: Content-Type = application/json |

### TC-019 - TGO - AC3 - Issuance Type Passed To Storage And Receipt List Unchanged
- **Req**: REQ-003, REQ-009 | **Condition**: TCOND-006 Issuance type Digital/Printed accepted, stored and propagated; invalid values rejected.
- **Type/Level/Technique/Category**: Positive / Integration / EP / Database
- **Priority/Severity/Risk/Automation**: 1 / High / High / Medium
- **Source**: [Work Item AC] AC3; Dependencies #1365562, #1445171
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. R-D1 (Digital) and R-P1 (Printed) ingested; property Technical Setting = All Receipts; receipt-list API (#1445171) available.
- **Test Data**: R-D1, R-P1; receipt-list request for P1 on S1

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Query ModuleReceiptContent for R-D1 and R-P1 and note issuanceType. |  |
| 2 | Call the player receipt-list API for P1 on S1. |  |
| 3 | Compare the receipt type returned for R-D1 and R-P1 with the stored values. | Stored issuanceType is Digital for R-D1 and Printed for R-P1, and the receipt-list response exposes the same types for each receipt with no conversion or defaulting. |

### TC-020 - TGO - AC3 - Invalid issuanceType Values Rejected
- **Req**: REQ-003 | **Condition**: TCOND-006 Issuance type Digital/Printed accepted, stored and propagated; invalid values rejected.
- **Type/Level/Technique/Category**: Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 2 / High / High / High
- **Source**: [Work Item AC] AC3
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: issuanceType = "Kiosk" | "Email" | "Paper" | "" | "Digital,Printed"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send one ingestion request per invalid issuanceType value (new receiptIdentifier each). |  |
| 2 | Query ModuleReceiptContent for the receipt IDs used. | Each request returns HTTP 400 Bad Request in the standard Connector error format (errorCode + message) identifying issuanceType; no rows stored and no default type applied. AND verify response header: Content-Type = application/json |

### TC-021 - TGO - AC3 - issuanceType Casing And Padding Handled Consistently
- **Req**: REQ-003 | **Condition**: TCOND-006 Issuance type Digital/Printed accepted, stored and propagated; invalid values rejected.
- **Type/Level/Technique/Category**: Boundary / Integration / BVA / API
- **Priority/Severity/Risk/Automation**: 3 / Medium / Medium / High
- **Source**: [Work Item AC] AC3
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: issuanceType = "digital" | "PRINTED" | " Printed "

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send ingestion requests with lower-case, upper-case and padded issuanceType values. |  |
| 2 | Query ModuleReceiptContent for accepted receipts. | Behaviour is consistent with the contract: either all variants rejected with HTTP 400 Bad Request in the standard Connector error format (errorCode + message), or accepted and normalised to the canonical 'Digital'/'Printed' value in storage - never stored in a non-canonical form that downstream list filtering would miss. |

### TC-022 - TGO - AC3 - Printed Receipt Not Classified As Digitally Delivered
- **Req**: REQ-003, REQ-004 | **Condition**: TCOND-007 Printed receipt never classified as digital; list visibility follows Technical Setting.
- **Type/Level/Technique/Category**: Negative / System / Error Guessing / Functional
- **Priority/Severity/Risk/Automation**: 1 / High / High / Medium
- **Source**: [Work Item AC] AC3
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. R-P1 ingested as Printed/None (TC-018); notification processing (#1349857) observable.
- **Test Data**: R-P1

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Query ModuleReceiptContent for R-P1 issuanceType and deliveryMethod. |  |
| 2 | Check notification processing for any delivery record for R-P1. |  |
| 3 | Call the receipt-list API for P1 with Technical Setting = Digital Only. | R-P1 remains issuanceType=Printed (not Digital), no email/SMS delivery record exists, and R-P1 is not returned under Digital Only. |

### TC-023 - TGO - AC3 - Receipt List Visibility By Technical Setting And Issuance Type
- **Req**: REQ-003, REQ-004 | **Condition**: TCOND-007 Printed receipt never classified as digital; list visibility follows Technical Setting.
- **Type/Level/Technique/Category**: Positive / System / Decision Table / Functional
- **Priority/Severity/Risk/Automation**: 1 / High / High / Medium
- **Source**: Description; AC3; #1445171
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. R-D1 (Digital, Issued, unexpired) and R-P1 (Printed, Issued, unexpired) ingested for P1; ability to switch the property Technical Setting between Digital Only and All Receipts.
- **Test Data**: Rules: (1) Digital Only + Digital -> listed; (2) Digital Only + Printed -> not listed; (3) All Receipts + Digital -> listed; (4) All Receipts + Printed -> listed

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Set Technical Setting = Digital Only and call the receipt-list API for P1. |  |
| 2 | Set Technical Setting = All Receipts and call the receipt-list API for P1. |  |
| 3 | Compare results against the decision table. | Digital Only returns R-D1 only; All Receipts returns both R-D1 and R-P1 - matching all four decision-table rules. |

### TC-024 - TGO - AC3 - Digital And Printed Use Same Identification And Lifecycle Fields
- **Req**: REQ-003 | **Condition**: TCOND-007 Printed receipt never classified as digital; list visibility follows Technical Setting.
- **Type/Level/Technique/Category**: Positive / Component / EP / Database
- **Priority/Severity/Risk/Automation**: 3 / Medium / Medium / High
- **Source**: [Work Item AC] AC3
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. R-D1 and R-P1 ingested.
- **Test Data**: R-D1, R-P1

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Query ModuleReceiptContent for R-D1 and R-P1 selecting all columns. |  |
| 2 | Compare populated identification/lifecycle columns between the two rows. | Both rows populate the same identification (site, player, receiptIdentifier, moduleIdentifier) and lifecycle (receiptStatus, transactionDate, expirationDate) columns; only issuanceType/deliveryMethod differ. |

### TC-025 - TGO - AC4 - Printed Receipt Content Handed To Loyalty Cloud Storage
- **Req**: REQ-004, REQ-009 | **Condition**: TCOND-008 Printed receipt with deliveryMethod None accepted, stored, and no email/SMS triggered.
- **Type/Level/Technique/Category**: Positive / Integration / EP / Functional
- **Priority/Severity/Risk/Automation**: 1 / High / High / Medium
- **Source**: [Work Item AC] AC4; #1365562
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. R-P1 ingested (TC-018).
- **Test Data**: R-P1

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Verify R-P1 is present in Loyalty Cloud storage with its HTML and metadata. |  |
| 2 | Retrieve the short Receipt URL created for R-P1 by #1365562 and open it. | Stored printed receipt content matches the ingested HTML and the short Receipt URL renders the same receipt as printed at the kiosk. |

### TC-026 - TGO - AC4 - Printed Receipt Ingestion Does Not Trigger Email Or SMS
- **Req**: REQ-004, REQ-013 | **Condition**: TCOND-008 Printed receipt with deliveryMethod None accepted, stored, and no email/SMS triggered.
- **Type/Level/Technique/Category**: Negative / Integration / EP / Functional
- **Priority/Severity/Risk/Automation**: 1 / High / High / Medium
- **Source**: [Work Item AC] AC4
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Player P1 has a valid email and mobile number; notification processing (#1349857) and test mailbox/SMS sink observable.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with issuanceType="Printed", deliveryMethod="None"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the printed receipt ingestion request. |  |
| 2 | Wait for the notification processing interval and check the notification queue/records. |  |
| 3 | Check the test mailbox and SMS sink for P1. | HTTP 200 'Receipt ingested successfully.'; no notification record is created and no email or SMS is received for the printed receipt. |

### TC-027 - TGO - AC4 - Printed Receipt With Email SMS Or Both Delivery Method
- **Req**: REQ-004, REQ-005 | **Condition**: TCOND-008 Printed receipt with deliveryMethod None accepted, stored, and no email/SMS triggered.
- **Type/Level/Technique/Category**: Negative / Integration / Decision Table / Functional
- **Priority/Severity/Risk/Automation**: 2 / High / High / Medium
- **Source**: [Work Item AC] AC4; AC5
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Notification processing observable.
- **Test Data**: issuanceType="Printed" with deliveryMethod = "Email" | "SMS" | "Both" (new receiptIdentifier each)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send a printed receipt with deliveryMethod Email. |  |
| 2 | Send a printed receipt with deliveryMethod SMS. |  |
| 3 | Send a printed receipt with deliveryMethod Both. |  |
| 4 | Check responses, stored rows and notification records. | Per the approved contract the combination is either rejected with HTTP 400 Bad Request in the standard Connector error format (errorCode + message) or accepted as Printed; in no case is an email/SMS automatically triggered for a printed receipt. |

### TC-028 - TGO - AC5 - Digital Receipt With Email Delivery Accepted
- **Req**: REQ-005 | **Condition**: TCOND-009 Delivery methods Email/SMS/Both/None accepted and propagated; invalid values rejected.
- **Type/Level/Technique/Category**: Positive / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC5
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with issuanceType="Digital", deliveryMethod="Email"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the digital receipt ingestion request with deliveryMethod Email. |  |
| 2 | Query ModuleReceiptContent for the receipt. | HTTP 200 'Receipt ingested successfully.'; receipt stored with issuanceType=Digital and deliveryMethod=Email. AND verify response header: Content-Type = application/json |

### TC-029 - TGO - AC5 - Digital Receipt With SMS Delivery Accepted
- **Req**: REQ-005 | **Condition**: TCOND-009 Delivery methods Email/SMS/Both/None accepted and propagated; invalid values rejected.
- **Type/Level/Technique/Category**: Positive / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC5
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with issuanceType="Digital", deliveryMethod="SMS"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the digital receipt ingestion request with deliveryMethod SMS. |  |
| 2 | Query ModuleReceiptContent for the receipt. | HTTP 200 'Receipt ingested successfully.'; receipt stored with issuanceType=Digital and deliveryMethod=SMS. AND verify response header: Content-Type = application/json |

### TC-030 - TGO - AC5 - Digital Receipt With Both Email And SMS Accepted
- **Req**: REQ-005 | **Condition**: TCOND-009 Delivery methods Email/SMS/Both/None accepted and propagated; invalid values rejected.
- **Type/Level/Technique/Category**: Positive / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC5
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with issuanceType="Digital", deliveryMethod="Both"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the digital receipt ingestion request with deliveryMethod Both. |  |
| 2 | Query ModuleReceiptContent for the receipt. | HTTP 200 'Receipt ingested successfully.'; receipt stored with issuanceType=Digital and deliveryMethod=Both. AND verify response header: Content-Type = application/json |

### TC-031 - TGO - AC5 - Digital Receipt With No Delivery Stored Only
- **Req**: REQ-005 | **Condition**: TCOND-009 Delivery methods Email/SMS/Both/None accepted and propagated; invalid values rejected.
- **Type/Level/Technique/Category**: Positive / Integration / EP / Functional
- **Priority/Severity/Risk/Automation**: 2 / Medium / Medium / High
- **Source**: [Work Item AC] AC5
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Notification processing observable.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with issuanceType="Digital", deliveryMethod="None"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the digital receipt ingestion request with deliveryMethod None. |  |
| 2 | Query ModuleReceiptContent and notification records for the receipt. | HTTP 200 'Receipt ingested successfully.'; receipt stored with deliveryMethod=None and no email/SMS notification is created (storage only). AND verify response header: Content-Type = application/json |

### TC-032 - TGO - AC5 - Delivery Method Propagated To Notification Processing
- **Req**: REQ-005, REQ-009 | **Condition**: TCOND-009 Delivery methods Email/SMS/Both/None accepted and propagated; invalid values rejected.
- **Type/Level/Technique/Category**: Positive / Integration / Decision Table / Functional
- **Priority/Severity/Risk/Automation**: 1 / High / High / Medium
- **Source**: [Work Item AC] AC5; #1349857
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Receipts from TC-028..TC-031 ingested; P1 has a valid email and mobile; notification processing (#1349857) and test mailbox/SMS sink observable.
- **Test Data**: Rules: Email -> email only; SMS -> SMS only; Both -> email + SMS; None -> nothing

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Check the notification requests generated for the Email, SMS, Both and None receipts. |  |
| 2 | Check the test mailbox and SMS sink for each receipt. |  |
| 3 | Compare channel(s) used per receipt against the decision table. | Each receipt produces exactly the channel(s) in its rule and carries the short Receipt URL; no receipt is delivered on an unrequested channel or more than once. |

### TC-033 - TGO - AC5 - Invalid deliveryMethod Values Rejected
- **Req**: REQ-005 | **Condition**: TCOND-009 Delivery methods Email/SMS/Both/None accepted and propagated; invalid values rejected.
- **Type/Level/Technique/Category**: Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 2 / Medium / Medium / High
- **Source**: [Work Item AC] AC5
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: deliveryMethod = "Fax" | "Email,SMS" | "Push" | "" | "email" | "BOTH"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send one ingestion request per invalid/variant deliveryMethod (new receiptIdentifier each). |  |
| 2 | Query ModuleReceiptContent for the receipt IDs used. | Unsupported values return HTTP 400 Bad Request in the standard Connector error format (errorCode + message) identifying deliveryMethod with no row stored; casing variants are either rejected or normalised consistently to the canonical value. AND verify response header: Content-Type = application/json |

### TC-034 - TGO - AC6 - Receipt Ingested With Issued Redeemed And Voided Status
- **Req**: REQ-006 | **Condition**: TCOND-010 Status values Issued/Redeemed/Voided accepted; invalid values rejected.
- **Type/Level/Technique/Category**: Positive / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC6; Comment #13585124
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with receiptStatus = "Issued" (R-S1) | "Redeemed" (R-S2) | "Voided" (R-S3)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request for R-S1 with receiptStatus Issued. |  |
| 2 | Send the ingestion request for R-S2 with receiptStatus Redeemed. |  |
| 3 | Send the ingestion request for R-S3 with receiptStatus Voided. |  |
| 4 | Query ModuleReceiptContent for R-S1, R-S2, R-S3. | All three return HTTP 200 'Receipt ingested successfully.' and each row stores its supplied receiptStatus and transactionDate. AND verify response header: Content-Type = application/json |

### TC-035 - TGO - AC6 - Invalid receiptStatus Values Rejected
- **Req**: REQ-006 | **Condition**: TCOND-010 Status values Issued/Redeemed/Voided accepted; invalid values rejected.
- **Type/Level/Technique/Category**: Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC6
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: receiptStatus = "Expired" | "Cancelled" | "Used" | "" | 1 | "issued"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send one ingestion request per invalid receiptStatus value (new receiptIdentifier each). |  |
| 2 | Query ModuleReceiptContent for the receipt IDs used. | Each unsupported value returns HTTP 400 Bad Request in the standard Connector error format (errorCode + message) identifying receiptStatus with no row stored; the casing variant 'issued' is rejected or normalised consistently per contract. AND verify response header: Content-Type = application/json |

### TC-036 - TGO - AC6 - Transaction Date After Expiration Returns TGO-CNT040
- **Req**: REQ-006, REQ-010 | **Condition**: TCOND-011 Transaction/expiration date validity, precision, timezone and ordering (TGO-CNT040).
- **Type/Level/Technique/Category**: Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC6; Wiki TGO-CNT040
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: transactionDate="2026-10-31T18:55:17.675Z", expirationDate="2026-10-01T18:55:17.675Z"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request with transactionDate 30 days after expirationDate. |  |
| 2 | Query ModuleReceiptContent for the receiptIdentifier. | HTTP 400 Bad Request in the standard Connector error format (errorCode + message) with errorCode TGO-CNT040 'Provided transaction date is after the expiration date'; no row is created in ModuleReceiptContent and nothing is handed to storage/notification processing. AND verify response header: Content-Type = application/json |

### TC-037 - TGO - AC6 - Transaction Date At Expiration Boundaries
- **Req**: REQ-006, REQ-010 | **Condition**: TCOND-011 Transaction/expiration date validity, precision, timezone and ordering (TGO-CNT040).
- **Type/Level/Technique/Category**: Boundary / Integration / BVA / API
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC6; Wiki TGO-CNT040
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: expirationDate="2026-10-31T18:55:17.675Z" with transactionDate = expiration - 1 ms ("...17.674Z") | = expiration ("...17.675Z") | expiration + 1 ms ("...17.676Z")

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the request with transactionDate 1 ms before expirationDate. |  |
| 2 | Send the request with transactionDate equal to expirationDate. |  |
| 3 | Send the request with transactionDate 1 ms after expirationDate. | Just-before and equal return HTTP 200 'Receipt ingested successfully.'; just-after returns HTTP 400 Bad Request in the standard Connector error format (errorCode + message) TGO-CNT040 with no row stored (confirm equality rule with Dev). AND verify response header: Content-Type = application/json |

### TC-038 - TGO - AC6 - Invalid Date Formats Rejected
- **Req**: REQ-006 | **Condition**: TCOND-011 Transaction/expiration date validity, precision, timezone and ordering (TGO-CNT040).
- **Type/Level/Technique/Category**: Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 2 / High / High / High
- **Source**: [Work Item AC] AC6
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: transactionDate/expirationDate = "2026-13-01T00:00:00Z" | "2026-02-30T00:00:00Z" | "31/10/2026" | "not-a-date" | "" | "0001-01-01T00:00:00Z" | "9999-12-31T23:59:59Z"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send ingestion requests with each invalid transactionDate value. |  |
| 2 | Send ingestion requests with each invalid expirationDate value. |  |
| 3 | Query ModuleReceiptContent for the receipt IDs used. | Impossible/unparseable/empty dates return HTTP 400 Bad Request in the standard Connector error format (errorCode + message) identifying the date field with no row stored; DateTime.Min/Max extremes are either rejected or stored without overflow (no 5xx). AND verify response header: Content-Type = application/json |

### TC-039 - TGO - AC6 - Expiration Date Already In The Past
- **Req**: REQ-006 | **Condition**: TCOND-011 Transaction/expiration date validity, precision, timezone and ordering (TGO-CNT040).
- **Type/Level/Technique/Category**: Boundary / Integration / BVA / Functional
- **Priority/Severity/Risk/Automation**: 2 / Medium / Medium / High
- **Source**: [Work Item AC] AC6; #1477504
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Receipt-list API available.
- **Test Data**: transactionDate="2026-09-20T10:00:00.000Z", expirationDate="2026-09-25T10:00:00.000Z" (both before today)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request with an already-expired expirationDate. |  |
| 2 | Query ModuleReceiptContent for the receipt. |  |
| 3 | Call the receipt-list API for P1. | Ingestion outcome follows the approved rule (accepted and stored, or rejected with HTTP 400 Bad Request in the standard Connector error format (errorCode + message)); if stored, the expired receipt is not returned as available in the receipt list. |

### TC-040 - TGO - AC6 - Timezone Offset And Precision Of Dates Preserved
- **Req**: REQ-006 | **Condition**: TCOND-011 Transaction/expiration date validity, precision, timezone and ordering (TGO-CNT040).
- **Type/Level/Technique/Category**: Boundary / Integration / BVA / Database
- **Priority/Severity/Risk/Automation**: 2 / Medium / Medium / High
- **Source**: [Work Item AC] AC6
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: (A) transactionDate="2026-10-01T18:55:17.675Z"; (B) transactionDate="2026-10-02T00:25:17.675+05:30", expirationDate="2026-10-01T19:00:00.000Z"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send request A and read the stored transactionDate. |  |
| 2 | Send request B (offset date equal to 18:55:17.675Z, before expiration once normalised). | A stores the date with millisecond precision; B returns HTTP 200 'Receipt ingested successfully.' (the TGO-CNT040 rule compares UTC-normalised instants) and stores the same UTC instant as A. |

### TC-041 - TGO - AC7 - Existing Promotion Receipt Integration Still Works
- **Req**: REQ-007 | **Condition**: TCOND-012 Existing promotion-receipt integrations unaffected; versioning rules honoured.
- **Type/Level/Technique/Category**: Positive / System / EP / Functional
- **Priority/Severity/Risk/Automation**: 1 / Critical / High / Medium
- **Source**: [Work Item AC] AC7
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Existing receipt/Distribute Voucher caller (pre-2.8.0 contract) and a sample legacy payload available from the current integration.
- **Test Data**: Legacy Distribute Voucher / promotion receipt request as sent by the current Trilogy integration

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the legacy promotion receipt request to the existing endpoint/version. |  |
| 2 | Verify the downstream behaviour of the legacy flow (voucher distribution) as before the change. | Legacy request returns the same success response and downstream result as the pre-change baseline; no new required field breaks the existing caller. |

### TC-042 - TGO - AC7 - Legacy Payload On New Versioned Contract Handled Explicitly
- **Req**: REQ-007, REQ-010 | **Condition**: TCOND-012 Existing promotion-receipt integrations unaffected; versioning rules honoured.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / API
- **Priority/Severity/Risk/Automation**: 2 / High / High / High
- **Source**: [Work Item AC] AC7
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Legacy payload available.
- **Test Data**: Legacy payload (without receiptHtml/issuanceType/deliveryMethod) sent to POST /S1/api/v1/player/receipt

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the legacy-shaped payload to the new ingestion route. |  |
| 2 | Query ModuleReceiptContent for any row created. | Request is rejected with HTTP 400 Bad Request in the standard Connector error format (errorCode + message) TGO-CNT034 listing the missing fields (no partial receipt), confirming legacy callers must stay on their supported contract until an approved migration. |

### TC-043 - TGO - AC7 - Unsupported API Version Rejected
- **Req**: REQ-007, REQ-010 | **Condition**: TCOND-012 Existing promotion-receipt integrations unaffected; versioning rules honoured.
- **Type/Level/Technique/Category**: Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 3 / Medium / Medium / High
- **Source**: [Work Item AC] AC7; Wiki 169844 TGO-CNT005
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: POST /S1/api/v2/player/receipt and /S1/api/v0/player/receipt with a valid body

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send a valid body to the v2 route. |  |
| 2 | Send a valid body to the v0 route. | Both return a controlled 4xx (404 or TGO-CNT005 'Invalid API Version') and store nothing; only v1 accepts ingestion. |

### TC-044 - TGO - AC8 - OfferMaker Module Receipt Ingested
- **Req**: REQ-008 | **Condition**: TCOND-013 Module identification, module enablement and property-agnostic processing.
- **Type/Level/Technique/Category**: Positive / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: [Work Item AC] AC8
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. OfferMaker module enabled for S1.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with moduleIdentifier=<OfferMaker module id>

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request with the OfferMaker moduleIdentifier. |  |
| 2 | Query ModuleReceiptContent for the receipt. | HTTP 200 'Receipt ingested successfully.'; receipt stored with moduleIdentifier = OfferMaker id. AND verify response header: Content-Type = application/json |

### TC-045 - TGO - AC8 - Legacy Promotions Module Receipt Ingested
- **Req**: REQ-008 | **Condition**: TCOND-013 Module identification, module enablement and property-agnostic processing.
- **Type/Level/Technique/Category**: Positive / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 2 / High / Medium / High
- **Source**: [Work Item AC] AC8
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Legacy promotions module enabled for S1.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with moduleIdentifier=<legacy promotions module id>

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request with the legacy promotions moduleIdentifier. |  |
| 2 | Query ModuleReceiptContent for the receipt. | HTTP 200 'Receipt ingested successfully.'; receipt stored with the legacy promotions moduleIdentifier and processed identically to OfferMaker receipts. AND verify response header: Content-Type = application/json |

### TC-046 - TGO - AC8 - Unknown moduleIdentifier Rejected
- **Req**: REQ-008 | **Condition**: TCOND-013 Module identification, module enablement and property-agnostic processing.
- **Type/Level/Technique/Category**: Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 2 / Medium / Medium / High
- **Source**: [Work Item AC] AC8; Wiki 169844 TGO-CNT025
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: moduleIdentifier = "UNKNOWN_MODULE" | "" | "<script>"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send ingestion requests with each invalid moduleIdentifier. |  |
| 2 | Query ModuleReceiptContent for the receipt IDs used. | Each returns HTTP 400 Bad Request in the standard Connector error format (errorCode + message) (TGO-CNT025 'Invalid module identifier' or TGO-CNT034 for empty); no rows stored. AND verify response header: Content-Type = application/json |

### TC-047 - TGO - AC8 - Module Enablement Configuration Controls Ingestion
- **Req**: REQ-008 | **Condition**: TCOND-013 Module identification, module enablement and property-agnostic processing.
- **Type/Level/Technique/Category**: Negative / Integration / Decision Table / Functional
- **Priority/Severity/Risk/Automation**: 2 / High / Medium / Medium
- **Source**: [Work Item AC] AC8; Wiki 169844 TGO-CNT028
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Ability to toggle the module enablement configuration for S1.
- **Test Data**: Rules: module enabled -> accepted; module disabled -> rejected; re-enabled -> accepted

| # | Step Action | Expected Result |
|---|---|---|
| 1 | With OfferMaker enabled, send an ingestion request (receipt R-E1). |  |
| 2 | Disable OfferMaker for S1 and send an ingestion request (receipt R-E2). |  |
| 3 | Re-enable OfferMaker and send an ingestion request (receipt R-E3). |  |
| 4 | Query ModuleReceiptContent for R-E1..R-E3. | R-E1 and R-E3 return HTTP 200 'Receipt ingested successfully.' and are stored; R-E2 is rejected (e.g. TGO-CNT028 'Trilogy Go Module is disabled') with no row stored. |

### TC-048 - TGO - AC8 - No Property-Specific Processing Across Sites
- **Req**: REQ-008 | **Condition**: TCOND-013 Module identification, module enablement and property-agnostic processing.
- **Type/Level/Technique/Category**: Positive / System / EP / Functional
- **Priority/Severity/Risk/Automation**: 2 / Medium / Medium / Medium
- **Source**: [Work Item AC] AC8; Feature #1320913 (Venetian, Caesars, Oaklawn)
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Two QA sites configured: a Venetian-like site and a non-Venetian site, both with the module enabled.
- **Test Data**: Identical body (different receiptIdentifier) sent to each site

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request to the Venetian site. |  |
| 2 | Send the same request to the non-Venetian site. |  |
| 3 | Compare responses and stored rows. | Both sites return HTTP 200 'Receipt ingested successfully.' with identical stored structure and processing; no site-specific branching or data differences other than site/tenant identifiers. |

### TC-049 - TGO - AC9 - Accepted Receipt Handed To Storage With Short Receipt URL
- **Req**: REQ-009 | **Condition**: TCOND-014 Hand-off to storage; success only after acceptance; no false success; correlation info on failure.
- **Type/Level/Technique/Category**: Positive / Integration / EP / Functional
- **Priority/Severity/Risk/Automation**: 1 / Critical / High / Medium
- **Source**: [Work Item AC] AC9; #1365562
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Storage story #1365562 deployed.
- **Test Data**: R-D1 from TC-001

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Verify R-D1 is stored in Loyalty Cloud by the #1365562 storage process. |  |
| 2 | Retrieve and open the short Receipt URL for R-D1. | R-D1 is persisted with its HTML and metadata, and the short Receipt URL renders the ingested receipt HTML. |

### TC-050 - TGO - AC9 - Storage Unavailable Never Returns Success
- **Req**: REQ-009, REQ-014 | **Condition**: TCOND-014 Hand-off to storage; success only after acceptance; no false success; correlation info on failure.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / Recovery
- **Priority/Severity/Risk/Automation**: 1 / Critical / High / Low
- **Source**: [Work Item AC] AC9
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Ability to make the ModuleReceiptContent database/storage unavailable in QA (with DevOps support).
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with receiptIdentifier=R-F1

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Make storage unavailable. |  |
| 2 | Send the ingestion request for R-F1. |  |
| 3 | Restore storage and re-send the same request for R-F1. |  |
| 4 | Query ModuleReceiptContent for R-F1. | During the outage a non-200 error is returned (e.g. 5xx / TGO-CNT017 with correlation id) - never 200; after recovery the retry returns HTTP 200 'Receipt ingested successfully.' and exactly one R-F1 row exists. |

### TC-051 - TGO - AC9 - Error Responses Carry Correlation Information
- **Req**: REQ-009, REQ-014 | **Condition**: TCOND-014 Hand-off to storage; success only after acceptance; no false success; correlation info on failure.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / API
- **Priority/Severity/Risk/Automation**: 2 / Medium / Medium / High
- **Source**: [Work Item AC] AC9
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Access to Connector logs (App Insights/Kibana).
- **Test Data**: Failing requests: missing receiptHtml (CNT034), duplicate ID (CNT035), invalid tenant (CNT014)

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send each failing request and capture the response body and headers. |  |
| 2 | Search Connector logs using the correlation/trace id from each response. | Each error response contains errorCode, message and a correlation/trace id (body or header) that locates the matching log entry; no stack trace or internal detail is exposed. |

### TC-052 - TGO - AC9 - Client Timeout Retry Does Not Create Duplicate Receipt
- **Req**: REQ-009, REQ-014 | **Condition**: TCOND-014 Hand-off to storage; success only after acceptance; no false success; correlation info on failure.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / Recovery
- **Priority/Severity/Risk/Automation**: 2 / High / High / Medium
- **Source**: [Work Item AC] AC9; Wiki TGO-CNT035
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with receiptIdentifier=R-T1; client timeout set to 1 ms

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request for R-T1 with a 1 ms client timeout so the client aborts. |  |
| 2 | Re-send the identical request with a normal timeout. |  |
| 3 | Query ModuleReceiptContent for R-T1. | Retry returns either HTTP 200 'Receipt ingested successfully.' (first attempt not committed) or TGO-CNT035 (first attempt committed); exactly one R-T1 row exists and only one notification is generated. |

### TC-053 - TGO - Wiki - Missing Tenant Header Returns TGO-CNT014
- **Req**: REQ-010 | **Condition**: TCOND-015 Tenant/meta headers, site scoping and documented error codes honoured.
- **Type/Level/Technique/Category**: Negative / Integration / EP / Security
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: Wiki TGO-CNT014
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"}; headers without x-evri-tenantid

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request without the x-evri-tenantid header. |  |
| 2 | Query ModuleReceiptContent for the receiptIdentifier. | HTTP 400 Bad Request in the standard Connector error format (errorCode + message) with errorCode TGO-CNT014 'Invalid Tenant'; no row is created in ModuleReceiptContent and nothing is handed to storage/notification processing. AND verify response header: Content-Type = application/json |

### TC-054 - TGO - Wiki - Invalid Tenant Header Returns TGO-CNT014
- **Req**: REQ-010 | **Condition**: TCOND-015 Tenant/meta headers, site scoping and documented error codes honoured.
- **Type/Level/Technique/Category**: Negative / Integration / EP / Security
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: Wiki TGO-CNT014
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: x-evri-tenantid = "00000000-0000-0000-0000-000000000000" | "invalid" | ""

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request with each invalid x-evri-tenantid value. |  |
| 2 | Query ModuleReceiptContent for the receipt IDs used. | Each returns HTTP 400 Bad Request in the standard Connector error format (errorCode + message) TGO-CNT014 'Invalid Tenant'; no rows stored. AND verify response header: Content-Type = application/json |

### TC-055 - TGO - Wiki - Missing Meta Header Returns TGO-CNT027
- **Req**: REQ-010 | **Condition**: TCOND-015 Tenant/meta headers, site scoping and documented error codes honoured.
- **Type/Level/Technique/Category**: Negative / Integration / EP / Security
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: Wiki TGO-CNT027
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"}; headers without x-evri-meta

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request without the x-evri-meta header. |  |
| 2 | Query ModuleReceiptContent for the receiptIdentifier. | HTTP 400 Bad Request in the standard Connector error format (errorCode + message) with errorCode TGO-CNT027 'invalid Meta'; no row is created in ModuleReceiptContent and nothing is handed to storage/notification processing. AND verify response header: Content-Type = application/json |

### TC-056 - TGO - Comment - x-evri-meta Format Variants Validated
- **Req**: REQ-010, REQ-011 | **Condition**: TCOND-016 Signature authentication enforced; meta format variants; distinct tenant vs meta errors.
- **Type/Level/Technique/Category**: Boundary / Integration / BVA / Security
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: Comment #13585124 (observations 2, 3)
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Confirmed meta contract from Dev ('PlayerId;' vs 'PlayerId;ModuleIdentifier;ModuleRecordIdentifier').
- **Test Data**: x-evri-meta encoding of: "1234787;" | "1234787" (no ;) | "1234787;OfferMaker;OFFR-R1" | ";" | "" | "abc;" | non-encoded plain text

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request with meta '1234787;'. |  |
| 2 | Send the request with meta '1234787' (no semicolon). |  |
| 3 | Send the request with the Launch-Content style meta '1234787;OfferMaker;OFFR-R1'. |  |
| 4 | Send requests with ';', empty, 'abc;' and non-encoded meta. |  |
| 5 | Query ModuleReceiptContent for the receipt IDs used. | Only the confirmed meta format(s) return HTTP 200 'Receipt ingested successfully.' and associate the receipt with player 1234787; every other variant returns HTTP 400 Bad Request in the standard Connector error format (errorCode + message) TGO-CNT027 'invalid Meta' with no row stored. |

### TC-057 - TGO - Comment - Request Without Signature Authentication Rejected
- **Req**: REQ-011 | **Condition**: TCOND-016 Signature authentication enforced; meta format variants; distinct tenant vs meta errors.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / Security
- **Priority/Severity/Risk/Automation**: 1 / Critical / High / High
- **Source**: Comment #13585124 (observation 1)
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Signature/authorization scheme for Content Service confirmed with Dev.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"}; valid tenant/meta headers but (a) no Signature/Authorization header, (b) invalid signature, (c) signature for a different body

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request without any Signature/Authorization header. |  |
| 2 | Send the request with an invalid signature. |  |
| 3 | Send the request with a signature computed for a different body. |  |
| 4 | Query ModuleReceiptContent for the receipt IDs used. | All three are rejected (e.g. TGO-CNT020 'Missing Authorization' / TGO-CNT010 'Invalid Signature') with no row stored. Current QA observation (200 without signature) must be logged as a defect if it persists. |

### TC-058 - TGO - Comment - Invalid Tenant And Invalid Meta Return Distinct Error Codes
- **Req**: REQ-010, REQ-011 | **Condition**: TCOND-016 Signature authentication enforced; meta format variants; distinct tenant vs meta errors.
- **Type/Level/Technique/Category**: Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 2 / Medium / Medium / High
- **Source**: Comment #13585124 (observation 4); Wiki 169844
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: (a) invalid x-evri-tenantid + valid meta; (b) valid tenant + invalid x-evri-meta; (c) both invalid

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send request (a) with only the tenant invalid. |  |
| 2 | Send request (b) with only the meta invalid. |  |
| 3 | Send request (c) with both invalid. | (a) returns TGO-CNT014 'Invalid Tenant', (b) returns TGO-CNT027 'invalid Meta' - never a combined code/message; (c) returns the documented precedence code (confirm, expected TGO-CNT014). |

### TC-059 - TGO - Wiki - Cross-Tenant Or Mismatched siteId Ingestion Rejected
- **Req**: REQ-010 | **Condition**: TCOND-015 Tenant/meta headers, site scoping and documented error codes honoured.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / Security
- **Priority/Severity/Risk/Automation**: 1 / Critical / High / High
- **Source**: Wiki (route siteId + tenant header)
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Second site S2 belongs to a different tenant.
- **Test Data**: Route /S2/api/v1/player/receipt with S1 tenant header and P1 meta; route /S1 with S2 tenant header

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request to site S2 using S1's tenant header. |  |
| 2 | Send the ingestion request to site S1 using S2's tenant header. |  |
| 3 | Query ModuleReceiptContent on both sites. | Both requests are rejected (TGO-CNT014 / TGO-CNT012 'Invalid site') and no receipt is created on either site. |

### TC-060 - TGO - Wiki - Non-Existent Or Inactive siteId Rejected
- **Req**: REQ-010 | **Condition**: TCOND-015 Tenant/meta headers, site scoping and documented error codes honoured.
- **Type/Level/Technique/Category**: Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 2 / Medium / Medium / High
- **Source**: Wiki route; Wiki 169844 TGO-CNT006/TGO-CNT029
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. An inactive site S3 exists in QA.
- **Test Data**: Route siteId = 999999 (non-existent) | S3 (inactive) | 'abc'

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request to a non-existent siteId. |  |
| 2 | Send the request to the inactive site S3. |  |
| 3 | Send the request with a non-numeric siteId. | Each returns a controlled 4xx (e.g. TGO-CNT006 'Casino site does not exist', TGO-CNT029 'Site is inactive', 400/404) with no row stored and no 5xx. |

### TC-061 - TGO - Wiki - Injection Payloads In Text Fields Stored Safely
- **Req**: REQ-010, REQ-014 | **Condition**: TCOND-015 Tenant/meta headers, site scoping and documented error codes honoured.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / Security
- **Priority/Severity/Risk/Automation**: 2 / High / Medium / High
- **Source**: Error Guessing (OWASP A03)
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: receiptIdentifier="R-1'; DROP TABLE ModuleReceiptContent;--", description="' OR '1'='1", templateName="<img src=x onerror=alert(1)>"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request containing SQL/script injection strings. |  |
| 2 | Query ModuleReceiptContent row count and the receipt, if stored. | Request is rejected with HTTP 400 Bad Request in the standard Connector error format (errorCode + message) or stored literally as data; no SQL executed, table intact, no 5xx or database error text in the response. |

### TC-062 - TGO - Wiki - Malformed JSON And Wrong Content-Type Rejected
- **Req**: REQ-010 | **Condition**: TCOND-015 Tenant/meta headers, site scoping and documented error codes honoured.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / API
- **Priority/Severity/Risk/Automation**: 2 / Medium / Medium / High
- **Source**: Wiki
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: (a) empty body; (b) truncated JSON '{"receiptIdentifier":'; (c) valid JSON with Content-Type=text/plain; (d) XML body with Content-Type=application/xml

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send request (a) with an empty body. |  |
| 2 | Send request (b) with truncated JSON. |  |
| 3 | Send request (c) with Content-Type text/plain. |  |
| 4 | Send request (d) with an XML body. | Each returns a controlled 400/415 in the standard error format, no 5xx and no row stored. AND verify response header: Content-Type = application/json |

### TC-063 - TGO - Wiki - Unsupported HTTP Methods Rejected
- **Req**: REQ-010 | **Condition**: TCOND-015 Tenant/meta headers, site scoping and documented error codes honoured.
- **Type/Level/Technique/Category**: Negative / Integration / EP / API
- **Priority/Severity/Risk/Automation**: 3 / Low / Low / High
- **Source**: Wiki (POST route)
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: PUT, PATCH, DELETE to /S1/api/v1/player/receipt with a valid body

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the valid body using PUT. |  |
| 2 | Send the valid body using PATCH. |  |
| 3 | Send a DELETE to the route. | Each returns 405 Method Not Allowed (or 404) and no receipt is created, updated or deleted. |

### TC-064 - TGO - Shared Route - Full Ingestion Body For Existing Receipt Not Treated As Status Update
- **Req**: REQ-012, REQ-010 | **Condition**: TCOND-017 Shared route never confuses ingestion with status update.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / Functional
- **Priority/Severity/Risk/Automation**: 1 / High / High / High
- **Source**: Wiki (shared route); #1445170
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. R-D1 exists with receiptStatus=Issued.
- **Test Data**: Full ingestion body with receiptIdentifier=R-D1, receiptStatus="Redeemed", new transactionDate

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the full ingestion body for existing R-D1 with receiptStatus Redeemed. |  |
| 2 | Query ModuleReceiptContent for R-D1. | HTTP 400 Bad Request in the standard Connector error format (errorCode + message) TGO-CNT035 'Receipt already exists'; R-D1 remains Issued with its original transactionDate (not silently updated through the ingestion path). AND verify response header: Content-Type = application/json |

### TC-065 - TGO - Shared Route - Partial Body For New Receipt Not Created
- **Req**: REQ-012, REQ-002 | **Condition**: TCOND-017 Shared route never confuses ingestion with status update.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / Functional
- **Priority/Severity/Risk/Automation**: 2 / High / Medium / High
- **Source**: Wiki (shared route); #1445170
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Receipt R-N1 does not exist.
- **Test Data**: Status-update shaped body {"receiptIdentifier":"R-N1","receiptStatus":"Issued","transactionDate":"<now UTC>"}

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the 3-field status-update shaped body for non-existent R-N1. |  |
| 2 | Query ModuleReceiptContent for R-N1. | Request is rejected (TGO-CNT038 'Receipt does not exist' or TGO-CNT034 'Missing required fields'); no receipt without HTML/metadata is created. |

### TC-066 - TGO - Scope - Ingestion Response Contains No Receipt List And Sends Nothing Synchronously
- **Req**: REQ-013 | **Condition**: TCOND-018 Ingestion itself sends no notification and returns no receipt list.
- **Type/Level/Technique/Category**: Positive / Component / EP / API
- **Priority/Severity/Risk/Automation**: 3 / Low / Low / High
- **Source**: [Work Item AC] Dependencies and boundaries
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment.
- **Test Data**: body {"receiptIdentifier":"<new unique ID, e.g. OFFR-R0000001nn>","moduleIdentifier":"<enabled module id, e.g. OfferMaker>","description":"<offer description>","templateName":"<template name>","receiptHtml":"<fully generated receipt HTML>","issuanceType":"Digital","deliveryMethod":"Email","receiptStatus":"Issued","transactionDate":"<now UTC, e.g. 2026-10-01T18:55:17.675Z>","expirationDate":"<future, e.g. 2026-10-31T18:55:17.675Z>"} with deliveryMethod="Both"

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send the ingestion request and capture the full response body. |  |
| 2 | Inspect Connector logs for any direct email/SMS provider call during the request. | Response contains only the approved success payload (no receipt list, no receipt HTML echo); Connector ingestion makes no direct email/SMS provider call - delivery occurs only via #1349857 processing. AND verify response header: Content-Type = application/json |

### TC-067 - TGO - NFR - Concurrent Ingestion Of Same receiptIdentifier
- **Req**: REQ-014, REQ-002 | **Condition**: TCOND-019 Concurrency, retry, dependency outage, throughput and logging behaviour.
- **Type/Level/Technique/Category**: Negative / Integration / Error Guessing / Database
- **Priority/Severity/Risk/Automation**: 2 / High / High / Medium
- **Source**: Error Guessing; Wiki TGO-CNT035
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Tool able to fire parallel requests (Postman runner / k6 / JMeter).
- **Test Data**: 10 parallel identical requests with receiptIdentifier=R-C1

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Fire 10 identical ingestion requests for R-C1 in parallel. |  |
| 2 | Collect all response codes. |  |
| 3 | Query ModuleReceiptContent for R-C1. | Exactly one request returns HTTP 200 'Receipt ingested successfully.' and the others TGO-CNT035 (no 5xx/deadlock errors); exactly one R-C1 row exists. |

### TC-068 - TGO - NFR - Sustained Ingestion Throughput And Response Time
- **Req**: REQ-014 | **Condition**: TCOND-019 Concurrency, retry, dependency outage, throughput and logging behaviour.
- **Type/Level/Technique/Category**: Positive / System / EP / Performance
- **Priority/Severity/Risk/Automation**: 3 / Medium / Medium / Medium
- **Source**: Description (Trilogy volume); implied NFR
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Performance SLA and expected peak receipts/minute confirmed with Product (not documented); load tool configured.
- **Test Data**: Unique receipts with ~50 KB receiptHtml at expected peak rate for 30 minutes

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Run the load at the expected peak rate for 30 minutes. |  |
| 2 | Monitor response times, error rate and Connector/DB resource usage. |  |
| 3 | Reconcile stored row count with successful responses. | Response times stay within the agreed SLA, error rate is 0% for valid requests, and stored rows equal the number of 200 responses. |

### TC-069 - TGO - NFR - Ingestion Outcomes Logged Without Sensitive Content
- **Req**: REQ-014, REQ-009 | **Condition**: TCOND-019 Concurrency, retry, dependency outage, throughput and logging behaviour.
- **Type/Level/Technique/Category**: Positive / Integration / Error Guessing / Security
- **Priority/Severity/Risk/Automation**: 3 / Medium / Medium / Low
- **Source**: AC9; implied NFR
- **Preconditions**: Connector Content Service (TGO 2.8.0, PR 186702) deployed to QA; ingestion endpoint POST /{siteId}/api/v1/player/receipt reachable for active site S1; caller holds a valid x-evri-tenantid for S1's tenant and a valid x-evri-meta for player P1 (currently implemented format 'PlayerId;'); read access to the ModuleReceiptContent database for verification; REST client (Postman) configured for the QA environment. Access to Connector logs.
- **Test Data**: One successful and one rejected (TGO-CNT034) ingestion

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Send one valid and one invalid ingestion request. |  |
| 2 | Search Connector logs for both requests. | Both outcomes are logged with timestamp, correlation id, site/tenant, receiptIdentifier and result code; tenant secrets, signature values and full receiptHtml are not written to logs. |

### TC-070 - TGO - E2E - OfferMaker Redemption At Kiosk Ingests Digital Receipt
- **Req**: REQ-015, REQ-001, REQ-005 | **Condition**: TCOND-020 Kiosk redemption in Trilogy results in a stored, listable receipt in Loyalty Cloud.
- **Type/Level/Technique/Category**: Positive / UAT / EP / Functional
- **Priority/Severity/Risk/Automation**: 1 / Critical / High / Low
- **Source**: Parent #1320913; Successor #1470255
- **Preconditions**: Trilogy kiosk (QA) connected to Connector QA; #1470255 deployed; OfferMaker offer configured to issue a digital receipt with Email delivery; player P1 carded in with a valid email. Navigation: Kiosk Home > Offers > <Offer> > Redeem.
- **Test Data**: Player P1 card; OfferMaker offer O-DIG

| # | Step Action | Expected Result |
|---|---|---|
| 1 | At the kiosk, card in as P1 and navigate Kiosk Home > Offers > O-DIG. |  |
| 2 | Redeem the offer and choose the digital receipt option. |  |
| 3 | Check Connector logs for the ingestion request from Trilogy. |  |
| 4 | Query ModuleReceiptContent and the receipt-list API for P1. |  |
| 5 | Check P1's mailbox. | Trilogy sends one ingestion request with the fully generated translated HTML; Connector returns 200; the receipt is stored as Digital/Email/Issued, appears in P1's receipt list, and the email with the Receipt URL is received. |

### TC-071 - TGO - E2E - Printed Kiosk Receipt Stored And Listed Under All Receipts
- **Req**: REQ-015, REQ-004, REQ-003 | **Condition**: TCOND-020 Kiosk redemption in Trilogy results in a stored, listable receipt in Loyalty Cloud.
- **Type/Level/Technique/Category**: Positive / UAT / EP / Functional
- **Priority/Severity/Risk/Automation**: 1 / High / High / Low
- **Source**: Parent #1320913; Description
- **Preconditions**: Trilogy kiosk (QA) with printer connected to Connector QA; #1470255 deployed; property Technical Setting = All Receipts; player P1 carded in. Navigation: Kiosk Home > Offers > <Offer> > Redeem > Print.
- **Test Data**: Player P1 card; offer O-PRN configured for printed receipt

| # | Step Action | Expected Result |
|---|---|---|
| 1 | At the kiosk, redeem O-PRN as P1 and choose Print. |  |
| 2 | Collect the printed receipt. |  |
| 3 | Query ModuleReceiptContent for the new receipt. |  |
| 4 | Call the receipt-list API for P1 and open the Receipt URL. |  |
| 5 | Check P1's mailbox and SMS for any notification. | The printed receipt is stored as Printed/None with HTML matching the printed content, appears in the list under All Receipts, and no email/SMS is sent. |

### TC-072 - TGO - E2E - Connector Unavailable During Kiosk Redemption Then Recovers
- **Req**: REQ-015, REQ-009 | **Condition**: TCOND-020 Kiosk redemption in Trilogy results in a stored, listable receipt in Loyalty Cloud.
- **Type/Level/Technique/Category**: Negative / System / Error Guessing / Recovery
- **Priority/Severity/Risk/Automation**: 2 / High / High / Low
- **Source**: Successor #1470255; AC9
- **Preconditions**: Kiosk QA environment; ability to stop the Connector Content Service temporarily.
- **Test Data**: Player P1; offer O-DIG

| # | Step Action | Expected Result |
|---|---|---|
| 1 | Stop the Connector Content Service. |  |
| 2 | Redeem O-DIG at the kiosk as P1. |  |
| 3 | Restart the Content Service and allow Trilogy retry (if designed). |  |
| 4 | Query ModuleReceiptContent for P1's new receipt. | Kiosk redemption is not corrupted by the outage; Trilogy logs the failed call with the Connector error/correlation; after recovery the receipt is ingested exactly once (or the gap is reported per the #1470255 retry design). |


