// locators/geo-fence.locators.ts
// Object Repository — Geo Fence Page (List + Create/Modify dialog)
// Route: /#/multi-tenant/geofencing
// NO Playwright imports — pure TypeScript constants

export const GeoFenceLocators = {
  // --- Breadcrumb ---
  breadcrumbNav:              'ul.custom-bread-crumb',
  breadcrumbDashboardLink:    'a[href="#/multi-tenant/dashboard"]',
  breadcrumbTenantLink:       'a[href="#/multi-tenant/tenants"]',
  breadcrumbGeoFenceLink:     'a[href="#/multi-tenant/geofencing"]',

  // --- Header Tenant / Site selectors ---
  // NOTE: on this page BOTH selectors carry the `.fixed-width-select` class, so they are
  // distinguished by DOM order: index 0 = Tenant, index 1 = Site. Page methods use .nth().
  headerSelect:               'ng-select.fixed-width-select',
  headerSelectNamePara:       'p:first-child',
  headerSelectOption:         '[role="option"]',
  headerSelectOptionPara:     '[role="option"] p:first-child',

  // --- Page Heading ---
  pageHeading:                'h2:has-text("Geo Fence Setup")',

  // --- Content / Empty State ---
  emptyStateMessage:          'p:has-text("Geo Fence Setup needs to be created at tenant-site level")',
  emptyStateImage:            '.geo-fence-setup img, .empty-state img',

  // --- List toolbar ---
  addIcon:                    '.plus-icon',
  actionsButton:              'button:has-text("Actions")',
  searchToggle:               'img[src*="search-icon"]',
  searchInput:                'input.search-input',

  // --- Data grid ---
  dataGrid:                   '[role="grid"][aria-label="Data grid"]',
  dataGridBodyRows:           '[role="grid"] [role="row"]:not(:first-child)',
  rowEditButton:              'button:has(img[src*="edit_icon"])',
  rowDeleteButton:            'button:has(img[src*="delete-red"])',

  // --- Delete confirmation (DevExtreme dxDialog) ---
  deleteConfirmDialog:        '.dx-dialog.dx-popup',
  deleteConfirmMessage:       '.dx-dialog .dx-dialog-message',
  deleteConfirmYes:           '.dx-dialog .dx-button:has-text("YES")',
  deleteConfirmCancel:        '.dx-dialog .dx-button:has-text("CANCEL")',

  // --- Create / Modify Geo Fence dialog ---
  dialog:                     '.modal',
  dialogHeadingCreate:        '.modal h4:has-text("Create Geo Fence")',
  dialogHeadingModify:        '.modal h4:has-text("Modify Geo Fence")',
  dialogClose:                '.modal button.modal-close',
  nameInput:                  '.modal #name',
  searchLocationInput:        '.modal input.pac-target-input',
  addressInput:               '.modal [formcontrolname="address"]',
  radiusInput:                '.modal input[formcontrolname="radius"]',
  latitudeInput:              '.modal input[formcontrolname="lat"]',
  longitudeInput:             '.modal input[formcontrolname="long"]',
  cancelButton:               '.modal button:has-text("Cancel")',
  saveButton:                 '.modal button:has-text("Save")',

  // --- Google Places autocomplete (rendered on <body>, outside the dialog) ---
  placesContainer:            '.pac-container',
  placesItem:                 '.pac-item',
} as const;
