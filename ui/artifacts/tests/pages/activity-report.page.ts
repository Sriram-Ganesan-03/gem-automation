// pages/activity-report.page.ts
// Page Object — TGO Service Activity Report Page
// Route: /#/multi-tenant/service-activity-report
import { Page, expect } from '@playwright/test';
import { ActivityReportLocators } from '../locators/activity-report.locators';
import { SharedComponentLocators } from '../locators/shared-components.locators';
import { config } from '../config/test-config';

export class ActivityReportPage {
  constructor(private readonly page: Page) {}

  // --- Navigation ---

  /**
   * Navigates directly to the Activity Report page.
   * Locator: ActivityReportLocators.pageHeading
   */
  async goto(): Promise<void> {
    console.log('[ActivityReportPage] goto — start');
    await this.page.goto(config.baseUrl + '#/multi-tenant/service-activity-report');
    await this.page.locator(ActivityReportLocators.pageHeading).waitFor({ state: 'visible' });
    console.log('[ActivityReportPage] goto — done');
  }

  // --- Accessibility ---

  /**
   * Asserts the Activity Report page is accessible: URL matches the route and the
   * "TGO Service Activity Report" heading is visible.
   * Locator: ActivityReportLocators.pageHeading
   */
  async assertAccessible(): Promise<void> {
    console.log('[ActivityReportPage] assertAccessible — start');
    await expect(this.page).toHaveURL(/#\/multi-tenant\/service-activity-report/);
    await expect(this.page.locator(ActivityReportLocators.pageHeading)).toBeVisible();
    console.log('[ActivityReportPage] assertAccessible — done');
  }

  // --- Breadcrumb Assertions ---

  /**
   * Returns all visible breadcrumb link text values in order.
   * Locator: SharedComponentLocators.breadcrumbLinks
   */
  async getBreadcrumbItems(): Promise<string[]> {
    console.log('[ActivityReportPage] getBreadcrumbItems — start');
    await this.page.locator(SharedComponentLocators.breadcrumbLinks).first().waitFor({ state: 'visible' });
    const items = await this.page.locator(SharedComponentLocators.breadcrumbLinks).allInnerTexts();
    console.log('[ActivityReportPage] getBreadcrumbItems — done');
    return items.map(t => t.trim()).filter(Boolean);
  }

  /**
   * Asserts the breadcrumb matches Dashboard > {tenantName} > Activity Report.
   * @param tenantName - The expected tenant display name in the breadcrumb.
   * Locator: SharedComponentLocators.breadcrumbLinks
   */
  async assertBreadcrumb(tenantName: string): Promise<void> {
    console.log('[ActivityReportPage] assertBreadcrumb — start');
    await expect(this.page.locator(ActivityReportLocators.breadcrumbDashboardLink)).toBeVisible();
    await expect(this.page.locator(ActivityReportLocators.breadcrumbTenantLink)).toHaveText(tenantName);
    await expect(this.page.locator(ActivityReportLocators.breadcrumbActivityReportLink)).toHaveText('Activity Report');
    console.log('[ActivityReportPage] assertBreadcrumb — done');
  }

  /**
   * Returns the text of the breadcrumb tenant link (second breadcrumb segment).
   * Locator: ActivityReportLocators.breadcrumbTenantLink
   */
  async getBreadcrumbTenantText(): Promise<string> {
    console.log('[ActivityReportPage] getBreadcrumbTenantText — start');
    const text = await this.page.locator(ActivityReportLocators.breadcrumbTenantLink).innerText();
    console.log('[ActivityReportPage] getBreadcrumbTenantText — done');
    return text.trim();
  }

  // --- Filters ---

  /**
   * Fills the Player ID search input.
   * @param value - Player ID to search for.
   * Locator: ActivityReportLocators.playerIdInput
   */
  async fillPlayerId(value: string): Promise<void> {
    console.log('[ActivityReportPage] fillPlayerId — start');
    await this.page.locator(ActivityReportLocators.playerIdInput).fill(value);
    console.log('[ActivityReportPage] fillPlayerId — done');
  }

  /**
   * Clicks the Search button to trigger the report query.
   * Locator: ActivityReportLocators.searchButton
   */
  async clickSearch(): Promise<void> {
    console.log('[ActivityReportPage] clickSearch — start');
    await this.page.locator(ActivityReportLocators.searchButton).click();
    console.log('[ActivityReportPage] clickSearch — done');
  }

  /**
   * Waits for the Activity Report page heading to be visible.
   * Locator: ActivityReportLocators.pageHeading
   */
  async waitForPage(): Promise<void> {
    console.log('[ActivityReportPage] waitForPage — start');
    await this.page.locator(ActivityReportLocators.pageHeading).waitFor({ state: 'visible' });
    console.log('[ActivityReportPage] waitForPage — done');
  }
}
