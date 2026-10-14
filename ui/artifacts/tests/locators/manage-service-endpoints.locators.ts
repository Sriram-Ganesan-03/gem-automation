// locators/manage-service-endpoints.locators.ts
// Object Repository — Manage Service EndPoints Page
// Route: /#/multi-tenant/manage-service-endpoints
// NO Playwright imports — pure TypeScript constants

export const ManageServiceEndpointsLocators = {
  // --- Breadcrumb ---
  breadcrumbNav:              'ul.custom-bread-crumb',
  breadcrumbDashboardLink:    'a[href="#/multi-tenant/dashboard"]',
  breadcrumbTenantLink:       'a[href="#/multi-tenant/tenants"]',
  breadcrumbManageServiceEndpointLink: 'a[href="#/multi-tenant/manage-service-endpoints"]',

  // --- Header Site Selector ---
  headerSiteSelector:         'ng-select:not(.fixed-width-select)',
  headerSiteNameText:         'ng-select:not(.fixed-width-select) p:first-child',
  headerSiteInput:            'ng-select:not(.fixed-width-select) input',

  // --- Page Heading ---
  pageHeading:                'h4:has-text("Manage Service Endpoints")',

  // --- Content / Info State ---
  infoMessage:                'p:has-text("Manage Service Endpoints cannot be modified at tenant-site level.")',
  infoImage:                  'img',

  // --- Actions ---
  cancelButton:               'button:has-text("Cancel")',
} as const;
