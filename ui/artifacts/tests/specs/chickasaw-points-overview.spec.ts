import { expect, test } from '@playwright/test';
import { ChickasawDashboardPage } from '../pages/chickasaw-dashboard.page';
import { ChickasawLoginPage } from '../pages/chickasaw-login.page';
import { PointsOverviewPage } from '../pages/points-overview.page';

test.describe('Chickasaw Portal Points Overview', () => {
  test('displays Points report records for the selected date range', async ({ page }) => {
    const loginPage = new ChickasawLoginPage(page);
    const dashboardPage = new ChickasawDashboardPage(page);
    const pointsOverviewPage = new PointsOverviewPage(page);

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

    await test.step('Expand GEM and Reports, then open Points', async () => {
      console.log('▶ Expand GEM and Reports, then open Points');
      await dashboardPage.expandGemReports();
      await dashboardPage.openPointsReport();
      await pointsOverviewPage.assertReportDisplayed();
    });

    await test.step('Set the report start date to 10/01/2026', async () => {
      console.log('▶ Set the report start date to 10/01/2026');
      await pointsOverviewPage.setStartDate();
    });

    await test.step('Set the report end date to 10/17/2026', async () => {
      console.log('▶ Set the report end date to 10/17/2026');
      await pointsOverviewPage.setEndDate();
      await pointsOverviewPage.assertDateRange();
    });

    await test.step('Refresh the report and verify that records are displayed', async () => {
      console.log('▶ Refresh the report and verify that records are displayed');
      const rowCount = await pointsOverviewPage.refreshAndWaitForRows();
      expect(rowCount).toBeGreaterThan(1);
    });
  });
});
