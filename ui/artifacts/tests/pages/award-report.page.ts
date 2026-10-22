import { expect, Page } from '@playwright/test';
import { config } from '../config/test-config';
import { resolveLocator } from '../locators/resolve-locator';
import { AwardReportLocators } from '../locators/award-report.locators';

export class AwardReportPage {
  constructor(private readonly page: Page) {}

  private get startDateInput() {
    return this.page.getByRole('combobox', {
      name: resolveLocator(AwardReportLocators.startDateLabel, config.appVersion),
      exact: true,
    });
  }

  private get endDateInput() {
    return this.page.getByRole('combobox', {
      name: resolveLocator(AwardReportLocators.endDateLabel, config.appVersion),
      exact: true,
    });
  }

  /**
   * Verifies that the Award report is displayed.
   * Locator: AwardReportLocators.awardHeading
   */
  async assertAwardReportDisplayed(): Promise<void> {
    await expect(
      this.page.getByText(
        resolveLocator(AwardReportLocators.awardHeading, config.appVersion),
        { exact: true },
      ).first(),
    ).toBeVisible();
    await expect(this.startDateInput).toBeVisible();
    await expect(this.endDateInput).toBeVisible();
  }

  private async selectDate(day: string, pickerIndex: number): Promise<void> {
    await this.page
      .getByRole('button', {
        name: resolveLocator(AwardReportLocators.chooseDateButton, config.appVersion),
        exact: true,
      })
      .nth(pickerIndex)
      .click();

    const calendar = this.page.getByRole('dialog', {
      name: resolveLocator(AwardReportLocators.calendarDialog, config.appVersion),
      exact: true,
    });
    await expect(calendar).toBeVisible();
    await calendar.getByRole('gridcell', { name: day, exact: true }).click();
  }

  /**
   * Sets the report start date to October 1, 2026.
   * Locator: AwardReportLocators.startDateLabel
   */
  async setStartDate(): Promise<void> {
    await this.selectDate('1', 0);
  }

  /**
   * Sets the report end date to October 17, 2026.
   * Locator: AwardReportLocators.endDateLabel
   */
  async setEndDate(): Promise<void> {
    await this.selectDate('17', 1);
  }

  /**
   * Refreshes the Award report and waits for its result rows.
   * Locator: AwardReportLocators.refreshButton and reportRows
   */
  async refreshAndWaitForRows(): Promise<number> {
    await this.page
      .getByRole('button', {
        name: resolveLocator(AwardReportLocators.refreshButton, config.appVersion),
        exact: true,
      })
      .click();

    const rows = this.page.locator(
      resolveLocator(AwardReportLocators.reportRows, config.appVersion),
    );
    await expect(rows.nth(1)).toBeVisible();
    return rows.count();
  }

  /**
   * Verifies the displayed date range matches the requested range.
   * Locators: AwardReportLocators.startDateLabel and endDateLabel
   */
  async assertDateRange(): Promise<void> {
    await expect(this.startDateInput).toHaveValue(/2026-10-01|10\/01\/2026/);
    await expect(this.endDateInput).toHaveValue(/2026-10-17|10\/17\/2026/);
  }
}
