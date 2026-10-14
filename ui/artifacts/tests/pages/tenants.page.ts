// pages/tenants.page.ts
// Page Object — Tenants (Tenant List) Page
// Route: /#/multi-tenant/tenants
import { Page, expect } from '@playwright/test';
import { TenantsLocators } from '../locators/tenants.locators';
import { config } from '../config/test-config';

export class TenantsPage {
 static readonly route = '/#/multi-tenant/tenants';

  constructor(private readonly page: Page) {}

  // --- Navigation ---

  /**
   * Navigates directly to the Tenants list page.
   * Locator: TenantsLocators.pageHeading
   */
  async goto(): Promise<void> {
    console.log('[TenantsPage] goto — start');
    await this.page.goto(config.baseUrl + '#/multi-tenant/tenants');
    await this.page.locator(TenantsLocators.pageHeading).waitFor({ state: 'visible' });
    console.log('[TenantsPage] goto — done');
  }

  // --- Assertions ---

  /**
   * Asserts the Tenants page is accessible: URL matches the tenants route and the
   * "Tenant List" heading is visible.
   * Locator: TenantsLocators.pageHeading
   */
  async assertAccessible(): Promise<void> {
    console.log('[TenantsPage] assertAccessible — start');
    await expect(this.page).toHaveURL(/#\/multi-tenant\/tenants/);
    await expect(this.page.locator(TenantsLocators.pageHeading)).toBeVisible();
    console.log('[TenantsPage] assertAccessible — done');
  }

  // --- Navigation / load ---

  async waitUntilLoaded(): Promise<void> {
    console.log('[TenantsPage] waitUntilLoaded — start');
    await expect(this.page).toHaveURL(/#\/multi-tenant\/tenants(\/|$|\?)/);
    await expect(this.page.locator(TenantsLocators.pageHeading)).toBeVisible();
    await expect(this.page.locator(TenantsLocators.dataGrid)).toBeVisible();
    console.log('[TenantsPage] waitUntilLoaded — done');
  }

  // --- Toolbar actions ---

  /**
   * Click the `+` icon in the Tenant List header to open the Create Tenant
   * form. The app navigates to `/tenants/tenant-form` (a full-page form,
   * not a modal).
   */
  async openCreateForm(): Promise<void> {
    console.log('[TenantsPage] openCreateForm — start');
    await this.page.locator(TenantsLocators.addButton).click();
    await expect(this.page).toHaveURL(/#\/multi-tenant\/tenants\/tenant-form$/);
    console.log('[TenantsPage] openCreateForm — done');
  }

  /**
   * Reveal the search input by clicking the right-hand search icon. Idempotent:
   * a no-op if the search block is already active.
   */
  async openSearch(): Promise<void> {
    console.log('[TenantsPage] openSearch — start');
    //wait for 10s for the Page to load and then check if the search input is visible
    await this.page.waitForTimeout(1000);
    const input = this.page.locator(TenantsLocators.searchInput);
    if (!(await input.isVisible())) {
      await this.page.locator(TenantsLocators.searchToggle).click();
    }
    await expect(input).toBeVisible();
    console.log('[TenantsPage] openSearch — done');
  }

  /**
   * Type a query into the tenant search input. Opens the search box first
   * if it is collapsed.
   */
  async search(term: string): Promise<void> {
    console.log(`[TenantsPage] search(${JSON.stringify(term)}) — start`);
    // Always close first (if open) so DevExtreme re-initialises its filter on re-open.
    const closeBtn = this.page.locator(TenantsLocators.searchClose);
    if (await closeBtn.isVisible()) await closeBtn.click();
    await this.openSearch();
    const input = this.page.locator(TenantsLocators.searchInput);
    await input.pressSequentially(term, { delay: 30 });
    // Give DevExtreme search panel time to filter (debounce + render).
    await this.page.waitForTimeout(300);
    console.log('[TenantsPage] search — done');
  }

  // --- Per-row actions ---

  /** Locator for a specific row by its Name column value. */
  rowByName(name: string): Locator {
    return this.page.getByRole('row', { name });
  }

  /**
   * Click the Edit icon on the row whose Name column equals `name`. Waits
   * until the row is visible first (needed after a search filter is applied).
   */
  async clickEditForRow(name: string): Promise<void> {
    console.log(`[TenantsPage] clickEditForRow(${JSON.stringify(name)}) — start`);
    const row = this.page.getByRole('row', { name });
    await expect(row).toBeVisible();
    await row.getByRole('img', { name: 'editicon' }).click();
    console.log('[TenantsPage] clickEditForRow — done');
  }

  /**
   * Click the Edit icon on the first visible data row. Used when the exact
   * row name is not known up front (e.g. editing the currently-selected
   * tenant after a search filter narrows the grid to it).
   */
  async clickEditForFirstRow(): Promise<void> {
    console.log('[TenantsPage] clickEditForFirstRow — start');
    const firstRow = this.page.locator(TenantsLocators.dataGridBodyRows).first();
    await expect(firstRow).toBeVisible();
    await firstRow.getByRole('img', { name: 'editicon' }).click();
    console.log('[TenantsPage] clickEditForFirstRow — done');
  }

  /**
   * Click the Delete (soft-delete) icon on the row whose Name column equals
   * `name`. This does NOT remove the row; the status flips to Inactive.
   */
  async clickDeleteForRow(name: string): Promise<void> {
    console.log(`[TenantsPage] clickDeleteForRow(${JSON.stringify(name)}) — start`);
    const row = this.page.getByRole('row', { name });
    await expect(row).toBeVisible();
    await row.getByRole('img', { name: 'deleteicon' }).click();
    await this.page.locator(TenantsLocators.deleteConfirmYes).click();
    // Re-search so the now-inactive row stays visible for follow-up assertions.
    await this.search(name);
    console.log('[TenantsPage] clickDeleteForRow — done');
  }

  // --- Assertions ---

  /**
   * Assert the given row's status badge is `active` — orange border/text.
   */
  async assertRowStatusActive(name: string): Promise<void> {
    console.log(`[TenantsPage] assertRowStatusActive(${JSON.stringify(name)}) — start`);
    const row = this.page.getByRole('row', { name });
    await expect(row.getByRole('gridcell', { name: 'Active' })).toBeVisible();
    console.log('[TenantsPage] assertRowStatusActive — done');
  }

  /**
   * Assert the given row's status badge is `inactive` — red border/text.
   */
  async assertRowStatusInactive(name: string): Promise<void> {
    console.log(`[TenantsPage] assertRowStatusInactive(${JSON.stringify(name)}) — start`);
    const row = this.page.getByRole('row', { name });
    await expect(row.getByRole('gridcell', { name: 'Inactive' })).toBeVisible();
    console.log('[TenantsPage] assertRowStatusInactive — done');
  }
}
