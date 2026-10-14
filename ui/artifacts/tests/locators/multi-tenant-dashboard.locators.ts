// locators/multi-tenant-dashboard.locators.ts
// Object Repository — Multi-Tenant Dashboard Page
// Route: /#/multi-tenant/dashboard
// NO Playwright imports — pure TypeScript constants

export const MultiTenantDashboardLocators = {
  // --- Multi-Tenant Selection Dialog (appears on first login) ---
  tenantSelectionDialog:        '#tenantSearchDialog',
  tenantSelectionDialogHeading: '#tenantSearchDialog h4.modal-title',
  chooseTenantHeading:          '#tenantSearchDialog .modal-body h4',
  tenantSearchInput:            '#tenantSearchDialog input[type="text"]',
  tenantOptionsListbox:         '[role="listbox"][aria-label="Options list"]',
  tenantOptionItem:             '[role="option"]',
  tenantOptionName:             '[role="option"] p:first-child',
  tenantOptionId:               '[role="option"] p:last-child',

  // --- Header ---
  headerLogoImage:              '.trilogy-logo-header img:first-child',
  headerTenantSelector:         'ng-select.fixed-width-select',
  headerTenantNameText:         'ng-select.fixed-width-select p:first-child',
  headerTenantIdText:           'ng-select.fixed-width-select p:last-child',
  headerTenantInput:            'ng-select.fixed-width-select input',
  headerDisclaimerButton:       'img[alt="Disclaimer-Image"]',
  headerNotificationIcon1:      '.trilogy-logo-header img[cursor="pointer"]:nth-of-type(1)',
  headerNotificationIcon2:      '.trilogy-logo-header img[cursor="pointer"]:nth-of-type(2)',

  // --- Sidebar Navigation ---
  sidebarNavTree:               '[role="tree"]',
  dashboardNavItem:             '[role="treeitem"][aria-label="Dashboard"]',
  tenantsNavItem:               '[role="treeitem"][aria-label="Tenants"]',
  activityReportNavItem:        '[role="treeitem"][aria-label="Activity Report"]',
  sitesNavItem:                 '[role="treeitem"][aria-label="Sites"]',
  geoFenceNavItem:              '[role="treeitem"][aria-label="Geo Fence"]',
  manageServiceEndPointsNavItem:'[role="treeitem"][aria-label="Manage Service EndPoints"]',
  manageDevicesNavItem:         '[role="treeitem"][aria-label="Manage Devices"]',

  // --- Breadcrumb ---
  breadcrumbNav:                'ul.custom-bread-crumb',
  breadcrumbDashboardLink:      'a[href="#/multi-tenant/dashboard"]',

  // --- Dashboard Content Cards ---
  tenantOnboardingCard:         'h2:has-text("Tenant Onboarding")',
  trilogyGoSettingsCard:        'h2:has-text("Trilogy Go Settings")',
  serviceActivityReportCard:    'h2:has-text("Service Activity Report")',
  geoFenceManagementCard:       'h2:has-text("Geo Fence Management")',
} as const;
