import { expect, Page } from '@playwright/test';
import { config } from '../config/test-config';
import { resolveLocator } from '../locators/resolve-locator';
import { PointsOverviewLocators } from '../locators/points-overview.locators';

export class PointsOverviewPage {
  constructor(private readonly page: Page) {}

  private get startDateInput() {
    return this.page.getByRole('combobox', {
      name: resolveLocator(PointsOverviewLocators.startDateLabel, config.appVersion),
      exact: true,
    });
  }

  private get endDateInput() {
    return this.page.getByRole('combobox', {
      name: resolveLocator(PointsOverviewLocators.endDateLabel, config.appVersion),
      exact: true,
    });
  }

  async assertReportDisplayed(): Promise<void> {
    await expect(
      this.page.getByText(
        resolveLocator(PointsOverviewLocators.heading, config.appVersion),
        { exact: true },
      ).first(),
    ).toBeVisible();
    await expect(this.startDateInput).toBeVisible();
    await expect(this.endDateInput).toBeVisible();
  }

  private async selectDate(day: string, pickerIndex: number): Promise<void> {
    await this.page
      .getByRole('button', {
        name: resolveLocator(PointsOverviewLocators.chooseDateButton, config.appVersion),
        exact: true,
      })
      .nth(pickerIndex)
      .click();

    const calendar = this.page.getByRole('dialog', {
      name: resolveLocator(PointsOverviewLocators.calendarDialog, config.appVersion),
      exact: true,
    });
    await expect(calendar).toBeVisible();
    await calendar.getByRole('gridcell', { name: day, exact: true }).click();
  }

  async setStartDate(): Promise<void> {
    await this.selectDate('1', 0);
  }

  async setEndDate(): Promise<void> {
    await this.selectDate('17', 1);
  }

  async assertDateRange(): Promise<void> {
    await expect(this.startDateInput).toHaveValue(/2026-10-01|10\/01\/2026/);
    await expect(this.endDateInput).toHaveValue(/2026-10-17|10\/17\/2026/);
  }

  async refreshAndWaitForRows(): Promise<number> {
    await this.page
      .getByRole('button', {
        name: resolveLocator(PointsOverviewLocators.refreshButton, config.appVersion),
        exact: true,
      })
      .click();

    const rows = this.page.locator(
      resolveLocator(PointsOverviewLocators.reportRows, config.appVersion),
    );
    await expect(rows.nth(1)).toBeVisible();
    return rows.count();
  }
}
