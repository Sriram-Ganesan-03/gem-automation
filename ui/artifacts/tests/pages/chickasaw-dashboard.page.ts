import { expect, Page } from '@playwright/test';
import { config } from '../config/test-config';
import { resolveLocator } from '../locators/resolve-locator';
import { ChickasawDashboardLocators } from '../locators/chickasaw-dashboard.locators';

export class ChickasawDashboardPage {
  constructor(private readonly page: Page) {}

  /**
   * Verifies that the Dashboard is displayed after successful login.
   * Locator: ChickasawDashboardLocators.dashboardHeading
   */
  async assertDashboardDisplayed(): Promise<void> {
    await expect(
      this.page.getByText(
        resolveLocator(ChickasawDashboardLocators.dashboardHeading, config.appVersion),
        { exact: true },
      ).first(),
    ).toBeVisible();
  }

  /**
   * Expands GEM and then Reports in the application navigation.
   * Locators: ChickasawDashboardLocators.menuToggleButton, gemNavigation, and reportsNavigation
   */
  async expandGemReports(): Promise<void> {
    await this.page
      .locator(resolveLocator(ChickasawDashboardLocators.menuToggleButton, config.appVersion))
      .first()
      .click();

    const gem = this.page.getByText(
      resolveLocator(ChickasawDashboardLocators.gemNavigation, config.appVersion),
      { exact: true },
    ).first();
    await gem.click();

    const reports = this.page.getByText(
      resolveLocator(ChickasawDashboardLocators.reportsNavigation, config.appVersion),
      { exact: true },
    ).first();
    await reports.waitFor({ state: 'visible' });
    await reports.click();
  }

  /**
   * Opens the Award report from the Reports navigation.
   * Locator: ChickasawDashboardLocators.awardNavigation
   */
  async openAwardReport(): Promise<void> {
    const award = this.page.getByText(
      resolveLocator(ChickasawDashboardLocators.awardNavigation, config.appVersion),
      { exact: true },
    ).first();
    await award.click();
  }

  /**
   * Opens the Points report from the Reports navigation.
   * Locator: ChickasawDashboardLocators.pointsNavigation
   */
  async openPointsReport(): Promise<void> {
    const points = this.page.getByText(
      resolveLocator(ChickasawDashboardLocators.pointsNavigation, config.appVersion),
      { exact: true },
    ).first();
    await points.click();
  }
}
