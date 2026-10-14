import { Page, expect } from '@playwright/test';
import { UserManagerLocators } from '../locators/user-manager.locators';

export class UserManagerPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/corporate\/user-manager$/);
  }

  async clickAddUser() {
    console.log('[UserManagerPage] clickAddUser — start');
    await this.page.locator(UserManagerLocators.addUserButton).first().click({ force: true });
    await this.page.waitForURL(/\/corporate\/user-manager\/create$/, { timeout: 10000 });
    console.log('[UserManagerPage] clickAddUser — done');
  }
}
