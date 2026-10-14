// Object repository for the Create Branch wizard (/property/create)
export const CreateBranchLocators = {
  // --- Tabs ---
  generalInformationTab: 'li:has-text("General Information")',
  propertyAddressTab: 'li:has-text("Property Address")',
  contactInformationTab: 'li:has-text("Contact Information")',

  // --- General Information ---
  branchNameInput: 'input[formcontrolname="propertyName"]',
  corporateNameDropdown: 'p-dropdown[placeholder="Select a corporate"]',
  currencyDropdown: 'app-multi-select[formcontrolname="currency"]',
  propertyTypeDropdown: 'app-multi-select[formcontrolname="propertyType"]',
  timeZoneDropdown: 'app-multi-select[formcontrolname="timeZone"]',
  statusSelectButton: 'p-selectbutton[formcontrolname="isActive"]',
  defaultPropertySelectButton: 'p-selectbutton[formcontrolname="default"]',

  // --- Property Address ---
  address1Input: 'input[formcontrolname="propertyAddress1"]',
  address2Input: 'input[formcontrolname="propertyAddress2"]',
  countryDropdown: 'app-multi-select[formcontrolname="country"]',
  stateDropdown: 'app-multi-select[formcontrolname="state"]',
  cityInput: 'input[formcontrolname="city"]',
  zipCodeInput: 'input[formcontrolname="zipCode"]',

  // --- Contact Information ---
  saveButton: 'button:has-text("Save")',
  cancelButton: 'button:has-text("Cancel")',
} as const;
