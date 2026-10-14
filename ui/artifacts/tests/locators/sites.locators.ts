// locators/sites.locators.ts
// Object Repository — Sites Page (List + Add/Edit Form)
// Routes:
//   List:    /#/multi-tenant/site-list/{tenantId}
//   Add:     /#/multi-tenant/site-list/site-form/{tenantId}
//   Edit:    /#/multi-tenant/site-list/site-form/{tenantId}/{siteId}
// NO Playwright imports — pure TypeScript constants

export const SitesLocators = {
  // --- Breadcrumb ---
  breadcrumbNav:                 'ul.custom-bread-crumb',
  breadcrumbDashboardLink:       'a[href="#/multi-tenant/dashboard"]',
  breadcrumbTenantLink:          'a[href="#/multi-tenant/tenants"]',
  breadcrumbSiteListLink:        'a[href*="/site-list/"]',

  // --- Page Heading ---
  pageHeading:                   'h2:has-text("Sites")',

  // --- Site List Toolbar ---
  addSiteButton:                 'img[alt="plus-icon"]',
  actionsButton:                 'button:has-text("Actions")',
  allFilterButton:               'button:has-text("All")',

  // --- Sites Data Grid ---
  dataGrid:                      '[role="grid"][aria-label="Data grid"]',
  dataGridSelectAllCheckbox:     '[role="columnheader"] [role="checkbox"]',
  dataGridHeaderThumbnail:       '[role="columnheader"]:has-text("thumbnail")',
  dataGridHeaderName:            '[role="columnheader"]:has-text("Name")',
  dataGridHeaderId:              '[role="columnheader"]:has-text("ID")',
  dataGridHeaderExternalId:      '[role="columnheader"]:has-text("External Id")',
  dataGridHeaderDateModified:    '[role="columnheader"]:has-text("Date Last Modified")',
  dataGridHeaderDateCreated:     '[role="columnheader"]:has-text("Date Created")',
  dataGridHeaderActive:          '[role="columnheader"]:has-text("Active")',
  dataGridHeaderActions:         '[role="columnheader"]:has-text("Actions")',
  dataGridBodyRows:              '[role="grid"] [role="rowgroup"]:last-child [role="row"]',
  dataGridRowEditButton:         'button:has(img[alt="editicon"])',
  dataGridRowDeleteButton:       'button:has(img[alt="deleteicon"])',

  // --- Site Form Tabs (Edit mode only) ---
  formTabSite:                   '.nav li:nth-child(1) a',
  formTabTgoSettings:            '.nav li:nth-child(2) a',

  // --- Site Form — Site Tab ---
  formHeading:                   'h2:has-text("Site")',
  formNameInput:                 'input[name="name"]',
  formExternalIdInput:           'input[name="propertyCode"]',
  formSiteIdSpinButton:          'input[type="number"], [role="spinbutton"]',
  formTrilogyBaseUrlInput:       'input[name="trilogyBaseUrl"]',
  formTimeZoneLabel:             'text=Time Zone',
  formTimeZoneCombobox:          'ng-select:has(input[placeholder=""])',
  formTimeZoneClearButton:       'ng-select .ng-clear-wrapper',
  formDescriptionInput:          'input[name="description"], textarea[name="description"]',
  formDisclaimerInput:           'textarea[name="disclaimer"]',
  formImageUploadButton:         'button:has-text("Choose File")',
  formReplaceLogoButton:         'button:has-text("Replace Logo")',
  formDeleteLogoButton:          'button:has-text("Delete Logo")',
  formCancelButton:              'button:has-text("Cancel")',
  formSaveButton:                'button:has-text("Save")',

  // --- Site Form — TGO Settings Tab ---
  tgoSettingsHeading:            'h3:has-text("TGO Settings")',
  tgoSettingsTree:               '.nav ~ div [role="tree"]',
  tgoGlobalSettingsNode:         '[role="treeitem"][aria-label="Global Settings"]',
  tgoModuleSettingsNode:         '[role="treeitem"][aria-label="Module Settings"]',

  // Global Settings children
  tgoApiPathsNode:               '[role="treeitem"][aria-label="API Paths"]',
  tgoAppInsightNode:             '[role="treeitem"][aria-label="APP Insight"]',
  tgoEveriPacketSigningNode:     '[role="treeitem"][aria-label="Everi Packet Signing Process"]',
  tgoSmtpSettingsNode:           '[role="treeitem"][aria-label="SMTP Settings"]',
  tgoMessagingConfigNode:        '[role="treeitem"][aria-label="Messaging Configuration"]',
  tgoStorageNode:                '[role="treeitem"][aria-label="Storage"]',
  tgoRedisCachingNode:           '[role="treeitem"][aria-label="Redis Caching Configuration"]',
  tgoGeneralSettingsNode:        '[role="treeitem"][aria-label="General Settings"]',
  tgoTextMessageSettingsNode:    '[role="treeitem"][aria-label="TextMessage Settings"]',
  tgoPkceNode:                   '[role="treeitem"][aria-label="PKCE"]',
  tgoAirshipConfigNode:          '[role="treeitem"][aria-label="Airship Configuration"]',

  // Module Settings children
  tgoRewardsNode:                '[role="treeitem"][aria-label="Rewards"]',
  tgoPayoutNetworkNode:          '[role="treeitem"][aria-label="PayoutNetwork-API Endpoints"]',
  tgoEpgNode:                    '[role="treeitem"][aria-label="EPG"]',
  tgoEveriPatronGatewayNode:     '[role="treeitem"][aria-label="Everi Patron Gateway System"]',
  tgoPaasNode:                   '[role="treeitem"][aria-label="PAAS"]',
  tgoPlayerActivityNode:         '[role="treeitem"][aria-label="Player Activity Aggregation Service"]',
  tgoMParticleNode:              '[role="treeitem"][aria-label="mParticle Configuration"]',
  tgoSportsRadarNode:            '[role="treeitem"][aria-label="Sports Radar"]',
  tgoSportsRadarServiceNode:     '[role="treeitem"][aria-label="Sports Radar Service"]',
  tgoJackpotExpressNode:         '[role="treeitem"][aria-label="Jackpot Express"]',
  tgoJackpotExpressServicesNode: '[role="treeitem"][aria-label="Jackpot Express Services"]',
  tgoRedemptionsNode:            '[role="treeitem"][aria-label="Redemptions"]',

  // API Paths panel fields
  tgoApiPathsPanelLabel:         'text=API Paths',
  tgoPkceTokenAuthPathInput:     'input[placeholder*="/loyalty/coreservices/tokenauthservice"], input[name="text"]:nth-of-type(1)',
  tgoPkmsFlexRewardsPathInput:   'input[placeholder*="/loyalty/coreservices/controlpanelservice/api"]',
  tgoConnectorApiPathInput:      'input[placeholder*="/content/siteId"]',
  tgoExposedApiPathInput:        'input[placeholder*="/exposed/tgo/"]',
  tgoEReceiptProxyPathInput:     'input[placeholder*="/exposed/tgo/pkms"]',
  tgoControlPanelServicePathInput: 'input[placeholder*="/loyalty/coreservices/controlpanelservice"]',
  tgoTrilogyPathInput:           'input[placeholder*="/loyalty/coreservices/clientservice"]',
  tgoCancelButton:               'button:has-text("Cancel")',
} as const;
