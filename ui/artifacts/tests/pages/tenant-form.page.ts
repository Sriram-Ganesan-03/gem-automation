// tests/e2e/pages/tenant-form.page.ts
import { Page, expect } from '@playwright/test';
import { TenantFormLocators } from '../locators/tenant-form.locators';

/**
 * TenantFormPage — full-page Create / Edit tenant form.
 * Routes:
 *   Create: /#/multi-tenant/tenants/tenant-form
 *   Edit:   /#/multi-tenant/tenants/tenant-form/<tenantId>
 *
 * The same Angular component backs both modes. The `Save` button is disabled
 * until every required field is valid, so the page methods below deliberately
 * fill fields in order and let Angular's reactive-form validation gate the
 * click on Save.
 */
export class TenantFormPage {
  constructor(private readonly page: Page) {}

  /** Wait for either the Create or Edit form to be reachable. */
  async waitUntilLoaded(): Promise<void> {
    console.log('[TenantFormPage] waitUntilLoaded — start');
    await expect(this.page).toHaveURL(/#\/multi-tenant\/tenants\/tenant-form(\/.+)?$/);
    await expect(this.page.locator(TenantFormLocators.nameInput)).toBeVisible();
    console.log('[TenantFormPage] waitUntilLoaded — done');
  }

  // --- Field setters ---

  async fillName(value: string): Promise<void> {
    console.log(`[TenantFormPage] fillName(${JSON.stringify(value)}) — start`);
    await this.page.locator(TenantFormLocators.nameInput).fill(value);
    console.log('[TenantFormPage] fillName — done');
  }

  async fillTrilogyGoDomain(value: string): Promise<void> {
    console.log(`[TenantFormPage] fillTrilogyGoDomain(${JSON.stringify(value)}) — start`);
    await this.page.locator(TenantFormLocators.trilogyGoDomainInput).fill(value);
    console.log('[TenantFormPage] fillTrilogyGoDomain — done');
  }

  /** Fill the first Trilogy Domain input (used on Create). */
  async fillFirstTrilogyDomain(value: string): Promise<void> {
    console.log(`[TenantFormPage] fillFirstTrilogyDomain(${JSON.stringify(value)}) — start`);
    await this.page.locator(TenantFormLocators.trilogyDomainInputs).first().fill(value);
    console.log('[TenantFormPage] fillFirstTrilogyDomain — done');
  }

  async fillDescription(value: string): Promise<void> {
    console.log(`[TenantFormPage] fillDescription(${JSON.stringify(value)}) — start`);
    await this.page.locator(TenantFormLocators.descriptionInput).fill(value);
    console.log('[TenantFormPage] fillDescription — done');
  }

  /**
   * Click the "Add domain" plus icon to append a new empty Trilogy Domain
   * input, then fill it with `value`. Waits for the new input to appear
   * before typing.
   */
  async addTrilogyDomain(value: string): Promise<void> {
    console.log(`[TenantFormPage] addTrilogyDomain(${JSON.stringify(value)}) — start`);
    const inputs = this.page.locator(TenantFormLocators.trilogyDomainInputs);
    const initialCount = await inputs.count();
    await this.page.locator(TenantFormLocators.addDomainButton).click();
    await expect(inputs).toHaveCount(initialCount + 1);
    await inputs.last().fill(value);
    console.log('[TenantFormPage] addTrilogyDomain — done');
  }

  // --- Composite actions ---

  /**
   * Fill every required field of the Create form in order. Preconditions:
   * form is loaded and empty (i.e., Create mode).
   */
  async fillCreateForm(input: {
    name: string;
    trilogyGoDomain: string;
    trilogyDomain: string;
    description: string;
  }): Promise<void> {
    console.log('[TenantFormPage] fillCreateForm — start');
    await this.fillName(input.name);
    await this.fillTrilogyGoDomain(input.trilogyGoDomain);
    await this.fillFirstTrilogyDomain(input.trilogyDomain);
    await this.fillDescription(input.description);
    console.log('[TenantFormPage] fillCreateForm — done');
  }

  // --- Field getters (Edit mode — capture existing values) ---

  async getName(): Promise<string> {
    console.log('[TenantFormPage] getName — start');
    const value = await this.page.locator(TenantFormLocators.nameInput).inputValue();
    console.log(`[TenantFormPage] getName — done (${JSON.stringify(value)})`);
    return value;
  }

  async getTrilogyGoDomain(): Promise<string> {
    console.log('[TenantFormPage] getTrilogyGoDomain — start');
    const value = await this.page.locator(TenantFormLocators.trilogyGoDomainInput).inputValue();
    console.log(`[TenantFormPage] getTrilogyGoDomain — done (${JSON.stringify(value)})`);
    return value;
  }

  /** Read the first Trilogy Domain input value (as shown on the Edit form). */
  async getFirstTrilogyDomain(): Promise<string> {
    console.log('[TenantFormPage] getFirstTrilogyDomain — start');
    const value = await this.page.locator(TenantFormLocators.trilogyDomainInputs).first().inputValue();
    console.log(`[TenantFormPage] getFirstTrilogyDomain — done (${JSON.stringify(value)})`);
    return value;
  }

  async getDescription(): Promise<string> {
    console.log('[TenantFormPage] getDescription — start');
    const value = await this.page.locator(TenantFormLocators.descriptionInput).inputValue();
    console.log(`[TenantFormPage] getDescription — done (${JSON.stringify(value)})`);
    return value;
  }

  /**
   * Capture all editable field values of the currently open tenant (Edit mode)
   * for later reuse — e.g. attempting to re-create the same tenant to trigger
   * the "Tenant Already Exists" validation.
   */
  async captureValues(): Promise<{
    name: string;
    trilogyGoDomain: string;
    trilogyDomain: string;
    description: string;
  }> {
    console.log('[TenantFormPage] captureValues — start');
    const captured = {
      name: await this.getName(),
      trilogyGoDomain: await this.getTrilogyGoDomain(),
      trilogyDomain: await this.getFirstTrilogyDomain(),
      description: await this.getDescription(),
    };
    console.log('[TenantFormPage] captureValues — done');
    return captured;
  }

  // --- Validation assertions ---

  /**
   * Assert that saving a duplicate tenant surfaces the "Tenant Already Exists"
   * error notification (the create is rejected by the server).
   * Locator: TenantFormLocators.duplicateErrorText
   */
  async assertDuplicateTenantError(): Promise<void> {
    console.log('[TenantFormPage] assertDuplicateTenantError — start');
    await expect(this.page.locator(TenantFormLocators.duplicateErrorText).first()).toBeVisible({ timeout: 15000 });
    console.log('[TenantFormPage] assertDuplicateTenantError — done');
  }

  // --- Form buttons ---

  /**
   * Click Save. Waits for the button to become enabled first so callers do
   * not have to assert form validity separately.
   */
  async clickSave(): Promise<void> {
    console.log('[TenantFormPage] clickSave — start');
    const save = this.page.locator(TenantFormLocators.saveButton);
    await expect(save).toBeEnabled();
    await save.click();
    console.log('[TenantFormPage] clickSave — done');
  }

  async clickCancel(): Promise<void> {
    console.log('[TenantFormPage] clickCancel — start');
    await this.page.locator(TenantFormLocators.cancelButton).click();
    console.log('[TenantFormPage] clickCancel — done');
  }
}
