import { Page, expect } from '@playwright/test';
import { CreateBranchLocators } from '../locators/create-branch.locators';
import { resolveLocator } from '../locators/resolve-locator';
import { testConfig } from '../config/test-config';

export interface GeneralInformation {
  branchName: string;
  corporateName: string;
  currency: string;
  propertyType: string;
  timeZone: string;
}

export interface PropertyAddress {
  address1: string;
  country: string;
  state: string;
  city: string;
  zipCode: string;
}

export class CreateBranchPage {
  constructor(private readonly page: Page) {}

  async goto() {
    console.log('[CreateBranchPage] goto — start');
    await this.page.goto('/property/create');
    console.log('[CreateBranchPage] goto — done');
  }

  // --- Tab navigation ---

  /** Switches to the General Information tab. */
  async openGeneralInformationTab() {
    await this.page.locator(resolveLocator(CreateBranchLocators.generalInformationTab, testConfig.appVersion)).click();
  }

  /** Switches to the Property Address tab. */
  async openPropertyAddressTab() {
    await this.page.locator(resolveLocator(CreateBranchLocators.propertyAddressTab, testConfig.appVersion)).click();
  }

  /** Switches to the Contact Information tab. */
  async openContactInformationTab() {
    await this.page.locator(resolveLocator(CreateBranchLocators.contactInformationTab, testConfig.appVersion)).click();
  }

  // --- Custom dropdown helper (app-multi-select components) ---

  /** Opens an app-multi-select dropdown, searches, and selects the matching option. */
  private async selectFromMultiSelect(dropdownSelector: string, value: string) {
    const dropdown = this.page.locator(dropdownSelector);
    await dropdown.locator('.dropdown-header').click();
    await dropdown.locator('.search-box input').fill(value);
    await dropdown.locator('ul li', { hasText: value }).first().click();
  }

  /** Opens a PrimeNG p-dropdown and selects the matching option by visible text. */
  private async selectFromDropdown(dropdownSelector: string, value: string) {
    await this.page.locator(dropdownSelector).click();
    await this.page.locator('.p-dropdown-item', { hasText: value }).first().click();
  }

  // --- General Information ---

  /** Fills all General Information fields. Uses CreateBranchLocators general-information keys. */
  async fillGeneralInformation(data: GeneralInformation) {
    console.log('[CreateBranchPage] fillGeneralInformation — start');
    await this.page.locator(resolveLocator(CreateBranchLocators.branchNameInput, testConfig.appVersion)).fill(data.branchName);
    await this.selectFromDropdown(resolveLocator(CreateBranchLocators.corporateNameDropdown, testConfig.appVersion), data.corporateName);
    await this.selectFromMultiSelect(resolveLocator(CreateBranchLocators.currencyDropdown, testConfig.appVersion), data.currency);
    await this.selectFromMultiSelect(resolveLocator(CreateBranchLocators.propertyTypeDropdown, testConfig.appVersion), data.propertyType);
    await this.selectFromMultiSelect(resolveLocator(CreateBranchLocators.timeZoneDropdown, testConfig.appVersion), data.timeZone);
    console.log('[CreateBranchPage] fillGeneralInformation — done');
  }

  // --- Property Address ---

  /** Fills all Property Address fields. Uses CreateBranchLocators property-address keys. */
  async fillPropertyAddress(data: PropertyAddress) {
    console.log('[CreateBranchPage] fillPropertyAddress — start');
    await this.page.locator(resolveLocator(CreateBranchLocators.address1Input, testConfig.appVersion)).fill(data.address1);
    await this.selectFromMultiSelect(resolveLocator(CreateBranchLocators.countryDropdown, testConfig.appVersion), data.country);
    await this.selectFromMultiSelect(resolveLocator(CreateBranchLocators.stateDropdown, testConfig.appVersion), data.state);
    await this.page.locator(resolveLocator(CreateBranchLocators.cityInput, testConfig.appVersion)).fill(data.city);
    await this.page.locator(resolveLocator(CreateBranchLocators.zipCodeInput, testConfig.appVersion)).fill(data.zipCode);
    console.log('[CreateBranchPage] fillPropertyAddress — done');
  }

  // --- Contact Information ---

  /** Clicks Save on the Contact Information tab, persisting the new branch. */
  async clickSave() {
    console.log('[CreateBranchPage] clickSave — start');
    await this.page.locator(resolveLocator(CreateBranchLocators.saveButton, testConfig.appVersion)).click();
    console.log('[CreateBranchPage] clickSave — done');
  }

  // --- Assertions ---

  /** Asserts the Create Branch page has loaded (URL is /property/create). */
  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/property\/create$/);
  }
}
