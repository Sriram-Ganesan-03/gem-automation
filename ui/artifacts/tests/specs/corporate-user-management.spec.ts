import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { UserManagerPage } from '../pages/user-manager.page';
import { testConfig } from '../config/test-config';

test.describe('Corporate user management — add user', () => {
  test('logs in, opens user management, and starts adding a user', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const userManagerPage = new UserManagerPage(page);

    await test.step('Log in', async () => {
      await loginPage.login(testConfig.credentials.email, testConfig.credentials.password);
    });

    await test.step('Navigate to Corporate > User Management', async () => {
      await dashboardPage.goToUserManagement();
      await userManagerPage.expectLoaded();
    });

    await test.step('Open the Add User form', async () => {
      await userManagerPage.clickAddUser();
      await expect(page).toHaveURL(/\/corporate\/user-manager\/create$/);
    });
  });
});
