import { Page, expect } from '@playwright/test';
import { BranchListLocators } from '../locators/branch-list.locators';
import { resolveLocator } from '../locators/resolve-locator';
import { testConfig } from '../config/test-config';

export class BranchListPage {
  constructor(private readonly page: Page) {}

  /** Asserts the Branch List page has loaded (URL is /property). */
  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/property$/);
  }

  /**
   * Clicks the "Add branch" button and navigates to the Create Branch page.
   * Uses BranchListLocators.addBranchButton. Retries once since the button
   * click occasionally needs a second press to register (per scenario notes).
   */
  async clickAddBranch() {
    console.log('[BranchListPage] clickAddBranch — start');
    for (let attempt = 0; attempt < 2; attempt++) {
      await this.page.locator(resolveLocator(BranchListLocators.addBranchButton, testConfig.appVersion)).click({ force: true });
      const navigated = await this.page
        .waitForURL(/\/property\/create$/, { timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      if (navigated) break;
    }
    console.log('[BranchListPage] clickAddBranch — done');
  }
}
