import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { BranchListPage } from '../pages/branch-list.page';
import { CreateBranchPage } from '../pages/create-branch.page';
import { testConfig } from '../config/test-config';

test.describe('Add a new branch', () => {
  // Source: ui/input.txt (raw-file input; no explicit ADO test case ID available)
  test('logs in and creates a new branch from the Branch List page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const branchListPage = new BranchListPage(page);
    const createBranchPage = new CreateBranchPage(page);

    await test.step('Log in', async () => {
      console.log('▶️ Log in');
      await loginPage.login(testConfig.credentials.email, testConfig.credentials.password);
    });

    await test.step('Navigate to Branch > Branch List', async () => {
      console.log('▶️ Navigate to Branch > Branch List');
      await dashboardPage.goToBranchList();
      await branchListPage.expectLoaded();
    });

    await test.step('Click Add Branch', async () => {
      console.log('▶️ Click Add Branch');
      await branchListPage.clickAddBranch();
      await createBranchPage.expectLoaded();
    });

    await test.step('Fill General Information', async () => {
      console.log('▶️ Fill General Information');
      await createBranchPage.fillGeneralInformation({
        branchName: testConfig.newBranch.branchName,
        corporateName: testConfig.newBranch.corporateName,
        currency: testConfig.newBranch.currency,
        propertyType: testConfig.newBranch.propertyType,
        timeZone: testConfig.newBranch.timeZone,
      });
    });

    await test.step('Fill Property Address', async () => {
      console.log('▶️ Fill Property Address');
      await createBranchPage.openPropertyAddressTab();
      await createBranchPage.fillPropertyAddress({
        address1: testConfig.newBranch.address1,
        country: testConfig.newBranch.country,
        state: testConfig.newBranch.state,
        city: testConfig.newBranch.city,
        zipCode: testConfig.newBranch.zipCode,
      });
    });

    await test.step('Save from Contact Information', async () => {
      console.log('▶️ Save from Contact Information');
      await createBranchPage.openContactInformationTab();
      await createBranchPage.clickSave();
    });

    await test.step('Sign out', async () => {
      console.log('▶️ Sign out');
      await dashboardPage.signOut();
    });
  });
});
