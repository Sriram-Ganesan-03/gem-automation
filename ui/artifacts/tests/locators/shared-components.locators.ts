// locators/shared-components.locators.ts
// Object Repository — Shared Components (appear across multiple pages)
// NO Playwright imports — pure TypeScript constants

export const SharedComponentLocators = {
  // --- Breadcrumb (shared across all tenant-scoped pages) ---
  // The breadcrumb uses a plain <ul class="custom-bread-crumb"> (no explicit role="list")
  breadcrumbNav:               'ul.custom-bread-crumb',
  breadcrumbItems:             'ul.custom-bread-crumb li',
  breadcrumbLinks:             'ul.custom-bread-crumb a',
  breadcrumbDashboardLink:     'a[href="#/multi-tenant/dashboard"]',
  breadcrumbTenantLink:        'a[href="#/multi-tenant/tenants"]',

  // --- Header Tenant Switcher ---
  headerTenantNameParagraph:   'ng-select.fixed-width-select p.m-0',
  headerTenantIdParagraph:     'ng-select.fixed-width-select p:last-child',
  headerTenantCombobox:        'ng-select.fixed-width-select input',

  // --- Header Site Switcher (Activity Report, Geo Fence, Manage Service EndPoints) ---
  headerSiteNameParagraph:     '.ng-select-container .ng-value p:first-child',
  headerSiteCombobox:          'ng-select:not(.fixed-width-select) input',

  // --- Header Icon Buttons ---
  headerNotificationsButton:   '.trilogy-logo-header img[cursor="pointer"]:last-of-type',
  headerHamburgerIcon:         '.hamburger-icon',
  headerDisclaimerButton:      'img[alt="Disclaimer-Image"]',
  headerLogoImage:             '.trilogy-logo-header img:first-child',

  // --- Profile / Logout menu (top-right avatar dropdown) ---
  profileDropdownButton:       '#dropdownProfileButton',
  profileSignoutItem:          'xpath=//*[@id="dropdownProfileButton"]/following-sibling::*//*[normalize-space(text())="Signout"]',

  // --- Sidebar Navigation ---
  sidebarTree:                 '[role="tree"]',
  navItemDashboard:            '[role="treeitem"][aria-label="Dashboard"]',
  navItemTenants:              '[role="treeitem"][aria-label="Tenants"]',
  navItemActivityReport:       '[role="treeitem"][aria-label="Activity Report"]',
  navItemSites:                '[role="treeitem"][aria-label="Sites"]',
  navItemGeoFence:             '[role="treeitem"][aria-label="Geo Fence"]',
  navItemManageServiceEndPoints: '[role="treeitem"][aria-label="Manage Service EndPoints"]',
  navItemManageDevices:        '[role="treeitem"][aria-label="Manage Devices"]',

  // --- Multi-Tenant Selection Dialog ---
  tenantSelectionDialog:       '#tenantSearchDialog',
  tenantSelectionDialogTitle:  '#tenantSearchDialog .modal-title, #tenantSearchDialog h4',
  tenantDialogCombobox:        '#tenantSearchDialog input[type="text"]',
  tenantDialogOption:          '[role="option"]',
  tenantDialogOptionText:      '[role="option"] p:first-child',
  tenantDialogOptionId:        '[role="option"] p:last-child',

  // --- Confirm Delete Dialog (DevExtreme dxDialog) ---
  confirmDeleteDialog:         '.dx-dialog.dx-popup',
  confirmDeleteMessage:        '.dx-dialog .dx-dialog-message, .dx-popup-content p',
  confirmDeleteYesButton:      'button:has-text("YES")',
  confirmDeleteCancelButton:   'button:has-text("CANCEL")',

  // --- Data Grid (shared across Tenants, Sites, Manage Devices) ---
  dataGrid:                    '[role="grid"][aria-label="Data grid"]',
  dataGridHeaderRow:           '[role="grid"] [role="row"]:first-child',
  dataGridBodyRows:            '[role="grid"] [role="rowgroup"]:last-child [role="row"]',
  dataGridSelectAllCheckbox:   '[role="columnheader"] [role="checkbox"]',
  dataGridRowCheckbox:         '[role="gridcell"] [role="checkbox"]',
  dataGridEditButton:          'button:has(img[alt="editicon"])',
  dataGridDeleteButton:        'button:has(img[alt="deleteicon"])',
  dataGridSitesButton:         'button:has(img[alt="sitesicon"])',
  dataGridActionsButton:       'button:has-text("Actions")',
  dataGridAllFilterButton:     'button:has-text("All")',
  dataGridAddButton:           'img[alt="plus-icon"]',

  // --- Loading Spinner / Page Loader ---
  loadingGif:                  'img[alt="loadergif"]',
  pageSpinner:                 '.dx-loadindicator, .dx-loadpanel',

  // --- Toast / Alert Notifications ---
  toastContainer:              '.dx-toast-content, [class*="toast"]',
  toastMessage:                '.dx-toast-message',

  // --- Generic Modal ---
  modalOverlay:                '.modal.show, [class*="modal"][style*="display: block"]',
  modalHeader:                 '.modal-header',
  modalBody:                   '.modal-body',
  modalFooter:                 '.modal-footer',
  modalCloseButton:            '.modal-header .close, [data-dismiss="modal"]',

  // --- DevExtreme Dropdown (dx-dropdowneditor) ---
  dxDropdownInput:             '.dx-dropdowneditor-input-wrapper input',
  dxDropdownButton:            '.dx-dropdowneditor-button',
  dxListItem:                  '.dx-list-item',
  dxListItemContent:           '.dx-item-content',
  dxClearAllButton:            '.dx-clear-button-area, [title="Clear"]',

  // --- Form Action Buttons (shared across all forms) ---
  formSaveButton:              'button:has-text("Save")',
  formCancelButton:            'button:has-text("Cancel")',
} as const;
