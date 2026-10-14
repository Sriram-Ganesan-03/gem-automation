// locators/activity-report.locators.ts
// Object Repository — TGO Service Activity Report Page
// Route: /#/multi-tenant/service-activity-report
// NO Playwright imports — pure TypeScript constants

export const ActivityReportLocators = {
  // --- Breadcrumb ---
  breadcrumbNav:              'ul.custom-bread-crumb',
  breadcrumbDashboardLink:    'a[href="#/multi-tenant/dashboard"]',
  breadcrumbTenantLink:       'a[href="#/multi-tenant/tenants"]',
  breadcrumbActivityReportLink: 'a[href*="service-activity-report"]',

  // --- Header Site Selector (specific to this page) ---
  headerSiteSelector:         'ng-select:not(.fixed-width-select)',
  headerSiteNameText:         'ng-select:not(.fixed-width-select) p:first-child',
  headerSiteInput:            'ng-select:not(.fixed-width-select) input',

  // --- Page Heading ---
  pageHeading:                'h4:has-text("TGO Service Activity Report")',

  // --- Date Filters ---
  startDateLabel:             'text=Start Date',
  startDateCombobox:          '.dx-dropdowneditor-input-wrapper input[aria-label*="5/"]',
  startDatePickerButton:      '.dx-datebox button.dx-dropdowneditor-button:first-of-type',
  endDateLabel:               'text=End Date',
  endDateCombobox:            '.dx-dropdowneditor-input-wrapper input[aria-label*="End"]',
  endDatePickerButton:        '.dx-datebox button.dx-dropdowneditor-button:last-of-type',

  // --- Filter Dropdowns ---
  eventTypeCombobox:          '.dx-dropdowneditor-input-wrapper input[placeholder*="Event Type"], .dx-dropdowneditor-input-wrapper input',
  modulesCombobox:            '.dx-dropdowneditor-input-wrapper input[placeholder*="Modules"]',

  // --- Text Inputs ---
  playerIdInput:              'input[placeholder="player ID"]',
  correlationIdInput:         'input[placeholder="Correlation ID"]',

  // --- Actions ---
  searchButton:               'button:has-text("Search")',

  // --- Results Grid (shown after Search) ---
  resultsGrid:                '[role="grid"][aria-label="Data grid"]',
  resultsGridRows:            '[role="grid"] [role="rowgroup"]:last-child [role="row"]',
} as const;
