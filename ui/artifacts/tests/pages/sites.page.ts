// pages/sites.page.ts
// Page Object — Sites (Site List) Page
// Route: /#/multi-tenant/site-list/{tenantId}
import { Page, expect } from '@playwright/test';
import { SitesLocators } from '../locators/sites.locators';
import { SharedComponentLocators } from '../locators/shared-components.locators';
import { config } from '../config/test-config';

export class SitesPage {
  constructor(private readonly page: Page) {}

  // --- Navigation ---

  /**
   * Navigates to the Sites page for the given tenantId.
   * @param tenantId - The numeric tenant identifier used in the URL path.
   * Locator: SitesLocators.dataGrid
   */
  async goto(tenantId: string): Promise<void> {
    console.log('[SitesPage] goto — start');
    await this.page.goto(config.baseUrl + `#/multi-tenant/site-list/${tenantId}`);
    await this.page.locator(SitesLocators.dataGrid).waitFor({ state: 'visible' });
    console.log('[SitesPage] goto — done');
  }

  // --- Accessibility ---

  /**
   * Asserts the Sites page is accessible: URL matches the site-list route and the
   * "Sites" heading is visible.
   * Locator: SitesLocators.pageHeading
   */
  async assertAccessible(): Promise<void> {
    console.log('[SitesPage] assertAccessible — start');
    await expect(this.page).toHaveURL(/#\/multi-tenant\/site-list/);
    await expect(this.page.locator(SitesLocators.pageHeading)).toBeVisible();
    console.log('[SitesPage] assertAccessible — done');
  }

  // --- Breadcrumb Assertions ---

  /**
   * Returns all visible breadcrumb link texts in order.
   * Locator: SharedComponentLocators.breadcrumbLinks
   */
  async getBreadcrumbItems(): Promise<string[]> {
    console.log('[SitesPage] getBreadcrumbItems — start');
    await this.page.locator(SharedComponentLocators.breadcrumbLinks).first().waitFor({ state: 'visible' });
    const items = await this.page.locator(SharedComponentLocators.breadcrumbLinks).allInnerTexts();
    console.log('[SitesPage] getBreadcrumbItems — done');
    return items.map(t => t.trim()).filter(Boolean);
  }

  /**
   * Asserts the breadcrumb displays Dashboard > {tenantName} > Sites.
   * @param tenantName - The expected human-readable tenant name in the breadcrumb.
   * Locator: SitesLocators.breadcrumbTenantLink, SitesLocators.breadcrumbPageItem
   */
  async assertBreadcrumb(tenantName: string): Promise<void> {
    console.log('[SitesPage] assertBreadcrumb — start');
    await expect(this.page.locator(SitesLocators.breadcrumbDashboardLink)).toBeVisible();
    await expect(this.page.locator(SitesLocators.breadcrumbTenantLink)).toHaveText(tenantName);
    await expect(this.page.locator(SitesLocators.breadcrumbSiteListLink)).toHaveText('Sites');
    console.log('[SitesPage] assertBreadcrumb — done');
  }

  /**
   * Returns the text of the second breadcrumb segment (tenant name).
   * Locator: SitesLocators.breadcrumbTenantLink
   */
  async getBreadcrumbTenantText(): Promise<string> {
    console.log('[SitesPage] getBreadcrumbTenantText — start');
    const text = await this.page.locator(SitesLocators.breadcrumbTenantLink).innerText();
    console.log('[SitesPage] getBreadcrumbTenantText — done');
    return text.trim();
  }

  /**
   * Returns the count of rows in the sites data grid.
   * Locator: SitesLocators.dataGridRows
   */
  async getDataGridRowCount(): Promise<number> {
    console.log('[SitesPage] getDataGridRowCount — start');
    const count = await this.page.locator(SitesLocators.dataGridBodyRows).count();
    console.log('[SitesPage] getDataGridRowCount — done');
    return count;
  }

  /**
   * Waits for the Sites data grid to be visible.
   * Locator: SitesLocators.dataGrid
   */
  async waitForPage(): Promise<void> {
    console.log('[SitesPage] waitForPage — start');
    await this.page.locator(SitesLocators.dataGrid).waitFor({ state: 'visible' });
    console.log('[SitesPage] waitForPage — done');
  }
}
