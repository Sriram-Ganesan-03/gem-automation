// pages/manage-devices.page.ts
// Page Object — Manage Devices Page
// Route: /#/multi-tenant/manage-devices
import { Page, expect } from '@playwright/test';
import { ManageDevicesLocators } from '../locators/manage-devices.locators';
import { SharedComponentLocators } from '../locators/shared-components.locators';
import { config } from '../config/test-config';

export class ManageDevicesPage {
  constructor(private readonly page: Page) {}

  // --- Navigation ---

  /**
   * Navigates directly to the Manage Devices page.
   * Locator: ManageDevicesLocators.dataGrid
   */
  async goto(): Promise<void> {
    console.log('[ManageDevicesPage] goto — start');
    await this.page.goto(config.baseUrl + '#/multi-tenant/manage-devices');
    await this.page.locator(ManageDevicesLocators.dataGrid).waitFor({ state: 'visible' });
    console.log('[ManageDevicesPage] goto — done');
  }

  // --- Accessibility ---

  /**
   * Asserts the Manage Devices page is accessible: URL matches the route and the
   * "Manage Devices" heading is visible.
   * Locator: ManageDevicesLocators.pageHeading
   */
  async assertAccessible(): Promise<void> {
    console.log('[ManageDevicesPage] assertAccessible — start');
    await expect(this.page).toHaveURL(/#\/multi-tenant\/manage-devices/);
    await expect(this.page.locator(ManageDevicesLocators.pageHeading)).toBeVisible();
    console.log('[ManageDevicesPage] assertAccessible — done');
  }

  // --- Breadcrumb Assertions ---

  /**
   * Returns all visible breadcrumb link texts in order.
   * Locator: SharedComponentLocators.breadcrumbLinks
   */
  async getBreadcrumbItems(): Promise<string[]> {
    console.log('[ManageDevicesPage] getBreadcrumbItems — start');
    await this.page.locator(SharedComponentLocators.breadcrumbLinks).first().waitFor({ state: 'visible' });
    const items = await this.page.locator(SharedComponentLocators.breadcrumbLinks).allInnerTexts();
    console.log('[ManageDevicesPage] getBreadcrumbItems — done');
    return items.map(t => t.trim()).filter(Boolean);
  }

  /**
   * Asserts the breadcrumb displays Dashboard > {tenantName} > Manage Devices.
   * @param tenantName - The expected human-readable tenant name in the breadcrumb.
   * Locator: ManageDevicesLocators.breadcrumbTenantLink, ManageDevicesLocators.breadcrumbPageItem
   */
  async assertBreadcrumb(tenantName: string): Promise<void> {
    console.log('[ManageDevicesPage] assertBreadcrumb — start');
    await expect(this.page.locator(ManageDevicesLocators.breadcrumbDashboardLink)).toBeVisible();
    await expect(this.page.locator(ManageDevicesLocators.breadcrumbTenantLink)).toHaveText(tenantName);
    await expect(this.page.locator(ManageDevicesLocators.breadcrumbManageDevicesLink)).toHaveText('Manage Devices');
    console.log('[ManageDevicesPage] assertBreadcrumb — done');
  }

  /**
   * Returns the text of the second breadcrumb segment (tenant name).
   * Locator: ManageDevicesLocators.breadcrumbTenantLink
   */
  async getBreadcrumbTenantText(): Promise<string> {
    console.log('[ManageDevicesPage] getBreadcrumbTenantText — start');
    const text = await this.page.locator(ManageDevicesLocators.breadcrumbTenantLink).innerText();
    console.log('[ManageDevicesPage] getBreadcrumbTenantText — done');
    return text.trim();
  }

  /**
   * Waits for the Manage Devices data grid to be visible.
   * Locator: ManageDevicesLocators.dataGrid
   */
  async waitForPage(): Promise<void> {
    console.log('[ManageDevicesPage] waitForPage — start');
    await this.page.locator(ManageDevicesLocators.dataGrid).waitFor({ state: 'visible' });
    console.log('[ManageDevicesPage] waitForPage — done');
  }
}
