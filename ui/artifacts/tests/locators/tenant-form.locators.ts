// locators/tenant-form.locators.ts
// Object Repository — Tenant Create / Edit Form
// Routes:
//   Create: /#/multi-tenant/tenants/tenant-form
//   Edit:   /#/multi-tenant/tenants/tenant-form/<tenantId>
// NO Playwright imports — pure TypeScript constants

export const TenantFormLocators = {
  nameInput:            'role=textbox[name="name"]',
  trilogyGoDomainInput: 'role=textbox[name="trilogyGoDomain"]',
  trilogyDomainInputs:  'role=textbox[name="trilogyDomain"]',
  descriptionInput:     'role=textbox[name="description"]',
  addDomainButton:      'img[alt="plus-icon"]',
  saveButton:           'role=button[name="Save"]',
  cancelButton:         'role=button[name="Cancel"]',

  // --- Validation / error notifications ---
  // Toast/alert surfaced when saving a tenant whose name already exists.
  errorToast:           '.dx-toast-error .dx-toast-message, .dx-toast-message, [class*="toast"]',
  duplicateErrorText:   'text=/already exists/i',
} as const;
