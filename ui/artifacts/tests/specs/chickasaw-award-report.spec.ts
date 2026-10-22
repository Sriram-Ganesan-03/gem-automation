import { expect, test } from '@playwright/test';
import { AwardReportPage } from '../pages/award-report.page';
import { ChickasawDashboardPage } from '../pages/chickasaw-dashboard.page';
import { ChickasawLoginPage } from '../pages/chickasaw-login.page';

test.describe('Chickasaw Portal Award Report', () => {
  test('displays Award report records for the selected date range', async ({ page }) => {
    const loginPage = new ChickasawLoginPage(page);
    const dashboardPage = new ChickasawDashboardPage(page);
    const awardReportPage = new AwardReportPage(page);

    await test.step('Open the application login page', async () => {
      console.log('▶ Open the application login page');
      await loginPage.goto();
    });

    await test.step('Select Direct Login', async () => {
      console.log('▶ Select Direct Login');
      await loginPage.selectDirectLogin();
    });

    await test.step('Sign in with configured credentials', async () => {
      console.log('▶ Sign in with configured credentials');
      await loginPage.signIn();
    });

    await test.step('Continue an existing session when prompted', async () => {
      console.log('▶ Continue an existing session when prompted');
      await loginPage.continueExistingSessionIfPrompted();
    });

    await test.step('Verify the Dashboard is displayed', async () => {
      console.log('▶ Verify the Dashboard is displayed');
      await dashboardPage.assertDashboardDisplayed();
    });

    await test.step('Expand GEM and Reports, then open Award', async () => {
      console.log('▶ Expand GEM and Reports, then open Award');
      await dashboardPage.expandGemReports();
      await dashboardPage.openAwardReport();
      await awardReportPage.assertAwardReportDisplayed();
    });

    await test.step('Set the report start date to 10/01/2026', async () => {
      console.log('▶ Set the report start date to 10/01/2026');
      await awardReportPage.setStartDate();
    });

    await test.step('Set the report end date to 10/17/2026', async () => {
      console.log('▶ Set the report end date to 10/17/2026');
      await awardReportPage.setEndDate();
      await awardReportPage.assertDateRange();
    });

    await test.step('Refresh the report and verify that records are displayed', async () => {
      console.log('▶ Refresh the report and verify that records are displayed');
      const rowCount = await awardReportPage.refreshAndWaitForRows();
      expect(rowCount).toBeGreaterThan(1);
    });
  });
});
