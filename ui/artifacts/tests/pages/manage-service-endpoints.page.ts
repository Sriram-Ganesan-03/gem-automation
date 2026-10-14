// pages/manage-service-endpoints.page.ts
// Page Object — Manage Service EndPoints Page
// Route: /#/multi-tenant/manage-service-endpoints
import { Page, expect } from '@playwright/test';
import { ManageServiceEndpointsLocators } from '../locators/manage-service-endpoints.locators';
import { config } from '../config/test-config';

export class ManageServiceEndpointsPage {
  constructor(private readonly page: Page) {}

  // --- Navigation ---

  /**
   * Navigates directly to the Manage Service EndPoints page.
   * Locator: ManageServiceEndpointsLocators.pageHeading
   */
  async goto(): Promise<void> {
    console.log('[ManageServiceEndpointsPage] goto — start');
    await this.page.goto(config.baseUrl + '#/multi-tenant/manage-service-endpoints');
    await this.page.locator(ManageServiceEndpointsLocators.pageHeading).waitFor({ state: 'visible' });
    console.log('[ManageServiceEndpointsPage] goto — done');
  }

  // --- Assertions ---

  /**
   * Asserts the Manage Service EndPoints page is accessible: URL matches the route and the
   * "Manage Service Endpoints" heading is visible.
   * Locator: ManageServiceEndpointsLocators.pageHeading
   */
  async assertAccessible(): Promise<void> {
    console.log('[ManageServiceEndpointsPage] assertAccessible — start');
    await expect(this.page).toHaveURL(/#\/multi-tenant\/manage-service-endpoints/);
    await expect(this.page.locator(ManageServiceEndpointsLocators.pageHeading)).toBeVisible();
    console.log('[ManageServiceEndpointsPage] assertAccessible — done');
  }
}
