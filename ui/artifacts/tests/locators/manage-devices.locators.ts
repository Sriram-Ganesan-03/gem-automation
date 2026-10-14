// locators/manage-devices.locators.ts
// Object Repository — Manage Devices Page (List + Add/Edit Form)
// Routes:
//   List:    /#/multi-tenant/manage-devices
//   Add:     /#/multi-tenant/manage-devices/manage-devices-form
//   Edit:    /#/multi-tenant/manage-devices/manage-devices-form/{deviceId}
// NO Playwright imports — pure TypeScript constants

export const ManageDevicesLocators = {
  // --- Breadcrumb ---
  breadcrumbNav:                   'ul.custom-bread-crumb',
  breadcrumbDashboardLink:         'a[href="#/multi-tenant/dashboard"]',
  breadcrumbTenantLink:            'a[href="#/multi-tenant/tenants"]',
  breadcrumbManageDevicesLink:     'a[href="#/multi-tenant/manage-devices"]',

  // --- Page Heading ---
  pageHeading:                     'h2:has-text("Manage Devices")',

  // --- Device List Toolbar ---
  addDeviceButton:                 'img[alt="plus-icon"]',
  actionsButton:                   'button:has-text("Actions")',
  allFilterButton:                 'button:has-text("All")',

  // --- Devices Data Grid ---
  dataGrid:                        '[role="grid"][aria-label="Data grid"]',
  dataGridSelectAllCheckbox:       '[role="columnheader"] [role="checkbox"]',
  dataGridHeaderDeviceId:          '[role="columnheader"]:has-text("Device ID")',
  dataGridHeaderName:              '[role="columnheader"]:has-text("Name")',
  dataGridHeaderDescription:       '[role="columnheader"]:has-text("Description")',
  dataGridHeaderDateCreated:       '[role="columnheader"]:has-text("Date Created")',
  dataGridHeaderActive:            '[role="columnheader"]:has-text("Active")',
  dataGridHeaderActions:           '[role="columnheader"]:has-text("Actions")',
  dataGridBodyRows:                '[role="grid"] [role="rowgroup"]:last-child [role="row"]',
  dataGridRowEditButton:           'button:has(img[alt="editicon"])',
  dataGridRowDeleteButton:         'button:has(img[alt="deleteicon"])',

  // --- Device Form ---
  formHeadingNew:                  'h2:has-text("New Device")',
  formHeadingEdit:                 'h2:not(:has-text("New Device"))',
  formNameInput:                   'input[name="name"]',
  formDeviceIdInput:               'input[name="Device ID"], input[placeholder="Device ID"]',
  formIosRadio:                    'input[type="radio"][value="iOS"], radio:has-text("iOS")',
  formAndroidRadio:                'input[type="radio"][value="Android"], radio:has-text("Android")',
  formActiveCheckbox:              'input[type="checkbox"]:near(p:has-text("Active"))',
  formDescriptionInput:            'textarea[name="description"]',
  formCancelButton:                'button:has-text("Cancel")',
  formSaveButton:                  'button:has-text("Save")',

  // --- Device Form — Tenant Restrictions ---
  tenantRestrictionsHeading:       'h5:has-text("Tenant Restrictions")',
  tenantRestrictionsAllTenantsCheckbox: 'input[type="checkbox"]:near(text="All Tenants")',
  tenantRestrictionsTenantList:    '.tenant-restrictions, [class*="tenant"] input[type="checkbox"]',
} as const;
