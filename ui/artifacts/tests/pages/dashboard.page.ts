import { Page } from '@playwright/test';
import { DashboardLocators } from '../locators/dashboard.locators';
import { SharedComponentLocators } from '../locators/shared-components.locators';
import { resolveLocator } from '../locators/resolve-locator';
import { testConfig } from '../config/test-config';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async openCorporateMenu() {
    console.log('[DashboardPage] openCorporateMenu — start');
    await this.page.locator(DashboardLocators.corporateMenu).click({ force: true });
    // the submenu reveal is CSS-transition driven; give it time to become clickable
    await this.page.waitForTimeout(500);
    console.log('[DashboardPage] openCorporateMenu — done');
  }

  async clickUserManagement() {
    console.log('[DashboardPage] clickUserManagement — start');
    await this.page.locator(DashboardLocators.userManagementMenuItem).click({ force: true });
    await this.page.waitForTimeout(500);
    console.log('[DashboardPage] clickUserManagement — done');
  }

  async goToUserManagement() {
    // the Corporate submenu open is CSS-hover/timing driven and occasionally misses the
    // first click, so retry the open+navigate sequence until the URL actually changes
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.openCorporateMenu();
      await this.clickUserManagement();
      const navigated = await this.page
        .waitForURL(/\/corporate\/user-manager$/, { timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      if (navigated) return;
    }
  }

  /** Opens the Branch top-nav module group. Uses DashboardLocators.branchMenu. */
  async openBranchMenu() {
    console.log('[DashboardPage] openBranchMenu — start');
    await this.page.locator(resolveLocator(DashboardLocators.branchMenu, testConfig.appVersion)).click({ force: true });
    // the submenu reveal is CSS-transition driven; give it time to become clickable
    await this.page.waitForTimeout(500);
    console.log('[DashboardPage] openBranchMenu — done');
  }

  /** Clicks the "Branch List" submenu item. Uses DashboardLocators.branchListMenuItem. */
  async clickBranchList() {
    console.log('[DashboardPage] clickBranchList — start');
    await this.page.locator(resolveLocator(DashboardLocators.branchListMenuItem, testConfig.appVersion)).click({ force: true });
    await this.page.waitForTimeout(500);
    console.log('[DashboardPage] clickBranchList — done');
  }

  /** Navigates to the Branch List page, retrying the open+navigate sequence like goToUserManagement(). */
  async goToBranchList() {
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.openBranchMenu();
      await this.clickBranchList();
      const navigated = await this.page
        .waitForURL(/\/property$/, { timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      if (navigated) return;
    }
  }

  /** Opens the profile side panel and signs out. Uses SharedComponentLocators.profileButton / signOutButton. */
  async signOut() {
    console.log('[DashboardPage] signOut — start');
    await this.page.locator(resolveLocator(SharedComponentLocators.profileButton, testConfig.appVersion)).click({ force: true });
    // the profile side panel slides in via a CSS transform transition; wait for it to finish before targeting Sign Out
    await this.page.waitForTimeout(500);
    const signOutButton = this.page.locator(resolveLocator(SharedComponentLocators.signOutButton, testConfig.appVersion));
    // on very large/maximized viewports the fixed-position side panel can report a bounding box
    // Playwright treats as outside the viewport, so dispatch the click directly on the element
    await signOutButton.evaluate((el: HTMLElement) => el.click());
    console.log('[DashboardPage] signOut — done');
  }
}
