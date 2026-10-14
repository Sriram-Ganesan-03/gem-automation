// pages/geo-fence.page.ts
// Page Object — Geo Fence Page (List + Create/Modify dialog)
// Route: /#/multi-tenant/geofencing
import { Page, Locator, expect } from '@playwright/test';
import { GeoFenceLocators as L } from '../locators/geo-fence.locators';
import { config } from '../config/test-config';

export class GeoFencePage {
  constructor(private readonly page: Page) {}

  // --- Navigation ---

  /**
   * Navigates directly to the Geo Fence page.
   * Locator: GeoFenceLocators.pageHeading
   */
  async goto(): Promise<void> {
    console.log('[GeoFencePage] goto — start');
    await this.page.goto(config.baseUrl + '#/multi-tenant/geofencing');
    await this.page.locator(L.pageHeading).waitFor({ state: 'visible' });
    console.log('[GeoFencePage] goto — done');
  }

  /**
   * Waits until the Geo Fence list page has loaded (heading visible + route matched).
   */
  async waitUntilLoaded(): Promise<void> {
    console.log('[GeoFencePage] waitUntilLoaded — start');
    await expect(this.page).toHaveURL(/#\/multi-tenant\/geofencing/);
    await expect(this.page.locator(L.pageHeading)).toBeVisible();
    console.log('[GeoFencePage] waitUntilLoaded — done');
  }

  // --- Header Tenant / Site selectors ---

  /** Locator for the Tenant header selector (DOM index 0). */
  private tenantSelect(): Locator {
    return this.page.locator(L.headerSelect).nth(0);
  }

  /** Locator for the Site header selector (DOM index 1). */
  private siteSelect(): Locator {
    return this.page.locator(L.headerSelect).nth(1);
  }

  /**
   * Return the tenant name displayed in the Geo Fence header tenant selector.
   * Locator: GeoFenceLocators.headerSelect (nth 0) + headerSelectNamePara
   */
  async getSelectedTenantName(): Promise<string> {
    console.log('[GeoFencePage] getSelectedTenantName — start');
    const text = (await this.tenantSelect().locator(L.headerSelectNamePara).innerText()).trim();
    console.log(`[GeoFencePage] getSelectedTenantName — done ("${text}")`);
    return text;
  }

  /**
   * Return the site name displayed in the Geo Fence header site selector.
   * Locator: GeoFenceLocators.headerSelect (nth 1) + headerSelectNamePara
   */
  async getSelectedSiteName(): Promise<string> {
    console.log('[GeoFencePage] getSelectedSiteName — start');
    const text = (await this.siteSelect().locator(L.headerSelectNamePara).innerText()).trim();
    console.log(`[GeoFencePage] getSelectedSiteName — done ("${text}")`);
    return text;
  }

  /**
   * Assert the tenant header selector shows the expected tenant (populated from Dashboard).
   */
  async assertTenantPopulated(nameContains: string): Promise<void> {
    console.log('[GeoFencePage] assertTenantPopulated — start');
    await expect(this.tenantSelect().locator(L.headerSelectNamePara)).toContainText(nameContains);
    console.log('[GeoFencePage] assertTenantPopulated — done');
  }

  /**
   * Assert the Site header selector defaults to "All Properties".
   */
  async assertSiteDefaultedToAllProperties(): Promise<void> {
    console.log('[GeoFencePage] assertSiteDefaultedToAllProperties — start');
    await expect(this.siteSelect().locator(L.headerSelectNamePara)).toHaveText('All Properties');
    console.log('[GeoFencePage] assertSiteDefaultedToAllProperties — done');
  }

  /**
   * Open the Site header dropdown and select the first real site
   * (the first option after the "All Properties" default). Returns the site name selected.
   * Locator: GeoFenceLocators.headerSelect (nth 1), headerSelectOption
   */
  async selectFirstSite(): Promise<string> {
    console.log('[GeoFencePage] selectFirstSite — start');
    await this.siteSelect().click();
    const options = this.page.locator(L.headerSelectOption);
    await options.first().waitFor({ state: 'visible' });
    // Skip the "All Properties" option; pick the first actual site.
    const firstSite = this.page.locator(`${L.headerSelectOption}:not(:has-text("All Properties"))`).first();
    const name = (await firstSite.locator('p').first().innerText()).trim();
    await firstSite.click();
    await expect(this.siteSelect().locator(L.headerSelectNamePara)).toHaveText(name);
    console.log(`[GeoFencePage] selectFirstSite — done ("${name}")`);
    return name;
  }

  // --- List / search ---

  /**
   * Reveal the toolbar search input (idempotent) by clicking the magnifier icon
   * when the input is not already visible.
   * Locator: GeoFenceLocators.searchToggle, searchInput
   */
  async openSearch(): Promise<void> {
    console.log('[GeoFencePage] openSearch — start');
    const input = this.page.locator(L.searchInput);
    if (!(await input.isVisible())) {
      await this.page.locator(L.searchToggle).click();
    }
    await expect(input).toBeVisible();
    console.log('[GeoFencePage] openSearch — done');
  }

  /**
   * Filter the Geo Fence grid by `term` using the toolbar search input.
   * Locator: GeoFenceLocators.searchInput
   */
  async search(term: string): Promise<void> {
    console.log(`[GeoFencePage] search(${JSON.stringify(term)}) — start`);
    await this.openSearch();
    const input = this.page.locator(L.searchInput);
    await input.fill('');
    await input.pressSequentially(term, { delay: 30 });
    await this.page.waitForTimeout(800);
    console.log('[GeoFencePage] search — done');
  }

  /** Return a locator for the grid row whose Name cell matches `name`. */
  rowByName(name: string): Locator {
    return this.page.getByRole('row', { name });
  }

  /** Assert a Geo Fence row with the given name is present in the grid. */
  async assertRowVisible(name: string): Promise<void> {
    console.log(`[GeoFencePage] assertRowVisible(${JSON.stringify(name)}) — start`);
    await expect(this.rowByName(name)).toBeVisible();
    console.log('[GeoFencePage] assertRowVisible — done');
  }

  /** Assert no Geo Fence row with the given name is present in the grid. */
  async assertRowAbsent(name: string): Promise<void> {
    console.log(`[GeoFencePage] assertRowAbsent(${JSON.stringify(name)}) — start`);
    await expect(this.rowByName(name)).toHaveCount(0);
    console.log('[GeoFencePage] assertRowAbsent — done');
  }

  // --- Create ---

  /**
   * Click the `+` icon to open the "Create Geo Fence" dialog.
   * Locator: GeoFenceLocators.addIcon, dialogHeadingCreate
   */
  async openCreateDialog(): Promise<void> {
    console.log('[GeoFencePage] openCreateDialog — start');
    await this.page.locator(L.addIcon).click();
    await expect(this.page.locator(L.dialogHeadingCreate)).toBeVisible();
    console.log('[GeoFencePage] openCreateDialog — done');
  }

  /**
   * Type the Name into the create/modify dialog.
   * Locator: GeoFenceLocators.nameInput
   */
  async fillName(name: string): Promise<void> {
    console.log(`[GeoFencePage] fillName(${JSON.stringify(name)}) — start`);
    await this.page.locator(L.nameInput).fill(name);
    console.log('[GeoFencePage] fillName — done');
  }

  /**
   * Search a location via the Google Places autocomplete and select the first suggestion.
   * The map then draws the circle and populates the Address / Latitude / Longitude fields.
   * Locator: GeoFenceLocators.searchLocationInput, placesContainer, placesItem
   */
  async searchAndSelectLocation(term: string): Promise<void> {
    console.log(`[GeoFencePage] searchAndSelectLocation(${JSON.stringify(term)}) — start`);
    const input = this.page.locator(L.searchLocationInput);
    const address = this.page.locator(L.addressInput);
    await input.click();
    // The app renders overlapping .pac-container nodes, which makes a direct click on a
    // suggestion unreliable (pointer interception). Select via the keyboard instead, and
    // retry the whole type→select cycle until the Address (readonly) field resolves.
    for (let attempt = 1; attempt <= 3; attempt++) {
      await input.fill('');
      await input.pressSequentially(term, { delay: 80 });
      await this.page
        .locator(`${L.placesContainer} ${L.placesItem}`)
        .first()
        .waitFor({ state: 'visible', timeout: 10000 })
        .catch(() => undefined);
      await this.page.waitForTimeout(500);
      await input.focus();
      await input.press('ArrowDown');
      await input.press('Enter');
      try {
        await expect(address).not.toHaveValue('', { timeout: 6000 });
        console.log(`[GeoFencePage] searchAndSelectLocation — done (attempt ${attempt})`);
        return;
      } catch {
        console.log(`[GeoFencePage] searchAndSelectLocation — attempt ${attempt} did not resolve, retrying`);
      }
    }
    throw new Error(`Could not resolve location "${term}" from Google Places autocomplete`);
  }

  /**
   * Set the radius (in feet) on the create/modify dialog.
   * Locator: GeoFenceLocators.radiusInput
   */
  async setRadius(radius: number): Promise<void> {
    console.log(`[GeoFencePage] setRadius(${radius}) — start`);
    const input = this.page.locator(L.radiusInput);
    await input.fill(String(radius));
    console.log('[GeoFencePage] setRadius — done');
  }

  /**
   * Click Save on the create/modify dialog and wait for the dialog to close.
   * Locator: GeoFenceLocators.saveButton
   */
  async clickSave(): Promise<void> {
    console.log('[GeoFencePage] clickSave — start');
    const save = this.page.locator(L.saveButton);
    await expect(save).toBeEnabled();
    await save.click();
    await expect(this.page.locator(L.dialog)).toBeHidden({ timeout: 15000 });
    console.log('[GeoFencePage] clickSave — done');
  }

  /**
   * Full create flow: open dialog, fill name, search + select location, set radius, save.
   */
  async createGeoFence(params: { name: string; location: string; radius: number }): Promise<void> {
    console.log('[GeoFencePage] createGeoFence — start');
    await this.openCreateDialog();
    await this.fillName(params.name);
    await this.searchAndSelectLocation(params.location);
    await this.setRadius(params.radius);
    await this.clickSave();
    console.log('[GeoFencePage] createGeoFence — done');
  }

  // --- Update ---

  /**
   * Click the Edit icon for the row whose Name matches `name`, opening the Modify dialog.
   * Locator: GeoFenceLocators.rowEditButton, dialogHeadingModify
   */
  async openEditDialog(name: string): Promise<void> {
    console.log(`[GeoFencePage] openEditDialog(${JSON.stringify(name)}) — start`);
    const row = this.rowByName(name);
    await expect(row).toBeVisible();
    await row.locator(L.rowEditButton).click();
    await expect(this.page.locator(L.dialogHeadingModify)).toBeVisible();
    console.log('[GeoFencePage] openEditDialog — done');
  }

  /**
   * Take a screenshot of the current dialog/page and store it under test-results/screenshots.
   */
  async takeScreenshot(fileName: string): Promise<void> {
    console.log(`[GeoFencePage] takeScreenshot(${JSON.stringify(fileName)}) — start`);
    await this.page.screenshot({ path: `test-results/screenshots/${fileName}`, fullPage: true });
    console.log('[GeoFencePage] takeScreenshot — done');
  }

  // --- Delete ---

  /**
   * Click the Delete icon for the row whose Name matches `name` and confirm the
   * DevExtreme "Are you sure…" dialog by clicking YES.
   * Locator: GeoFenceLocators.rowDeleteButton, deleteConfirmDialog, deleteConfirmYes
   */
  async deleteGeoFence(name: string): Promise<void> {
    console.log(`[GeoFencePage] deleteGeoFence(${JSON.stringify(name)}) — start`);
    const row = this.rowByName(name);
    await expect(row).toBeVisible();
    await row.locator(L.rowDeleteButton).click();
    // The DevExtreme confirm dialog wrapper reports as hidden even when shown, so wait
    // on the YES button (rendered inside the visible popup content) instead.
    const yes = this.page.locator(L.deleteConfirmYes);
    await yes.waitFor({ state: 'visible' });
    await yes.click();
    await expect(yes).toBeHidden();
    console.log('[GeoFencePage] deleteGeoFence — done');
  }

  // --- Assertions ---

  /**
   * Asserts the Geo Fence page is accessible: URL matches the geofencing route and the
   * "Geo Fence Setup" heading is visible.
   * Locator: GeoFenceLocators.pageHeading
   */
  async assertAccessible(): Promise<void> {
    console.log('[GeoFencePage] assertAccessible — start');
    await expect(this.page).toHaveURL(/#\/multi-tenant\/geofencing/);
    await expect(this.page.locator(L.pageHeading)).toBeVisible();
    console.log('[GeoFencePage] assertAccessible — done');
  }
}
