// locators/tenants.locators.ts
// Object Repository — Tenants Page (List + Add/Edit Form)
// Routes:
//   List:    /#/multi-tenant/tenants
//   Add:     /#/multi-tenant/tenants/tenant-form
//   Edit:    /#/multi-tenant/tenants/tenant-form/{tenantId}
// NO Playwright imports — pure TypeScript constants

export const TenantsLocators = {
  // --- Breadcrumb ---
  breadcrumbNav:                 'ul.custom-bread-crumb',
  breadcrumbDashboardLink:       'a[href="#/multi-tenant/dashboard"]',
  breadcrumbTenantListLink:      'a[href="#/multi-tenant/tenants"]',

  // --- Page Heading ---
  pageHeading:                   'h2:has-text("Tenant List")',

  // --- Tenant List Toolbar ---
  addTenantButton:               'img[alt="plus-icon"]',
  actionsButton:                 'button:has-text("Actions")',
  allFilterButton:               'button:has-text("All")',

  // --- Tenants Data Grid ---
  dataGrid:                      '[role="grid"][aria-label="Data grid"]',
  dataGridSelectAllCheckbox:     '[role="columnheader"] [role="checkbox"]',
  dataGridHeaderId:              '[role="columnheader"]:has-text("Id")',
  dataGridHeaderName:            '[role="columnheader"]:has-text("Name")',
  dataGridHeaderTrilogyDomain:   '[role="columnheader"]:has-text("Trilogy Domain")',
  dataGridHeaderOnboardStatus:   '[role="columnheader"]:has-text("Onboard Status")',
  dataGridHeaderSites:           '[role="columnheader"]:has-text("Sites")',
  dataGridHeaderDateCreated:     '[role="columnheader"]:has-text("Date Created")',
  dataGridHeaderDateModified:    '[role="columnheader"]:has-text("Date Modified")',
  dataGridHeaderActions:         '[role="columnheader"]:has-text("Actions")',
  dataGridBodyRows:              '[role="grid"] [role="rowgroup"]:last-child [role="row"]',
  dataGridRowSitesButton:        'button:has(img[alt="sitesicon"])',
  dataGridRowEditButton:         'button:has(img[alt="editicon"])',
  dataGridRowDeleteButton:       'button:has(img[alt="deleteicon"])',
  dataGridStatusActive:          '[role="gridcell"]:has-text("Active")',
  dataGridStatusOnboarded:       '[role="gridcell"]:has-text("Onboarded")',

  // --- Tenant Form — Add / Edit ---
  formHeading:                   'h2',
  formNameInput:                 'input[name="name"]',
  formTrilogyGoDomainInput:      'input[name="trilogyGoDomain"]',
  formTrilogyDomainInput:        'input[name="trilogyDomain"]',
  formAddDomainButton:           'img[alt="plus-icon"]',
  formDescriptionInput:          'input[name="description"], textarea[name="description"]',

  // Edit-only controls
  formViewSitesButton:           'button:has-text("View Site(s)")',

  // --- Form Action Buttons ---
  formCancelButton:              'button:has-text("Cancel")',
  formSaveButton:                'button:has-text("Save")',
} as const;
