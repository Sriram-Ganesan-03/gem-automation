// pages/multi-tenant-dashboard.page.ts
// Page Object — Multi-Tenant Dashboard Page
// Route: /#/multi-tenant/dashboard
import { Page, expect } from '@playwright/test';
import { MultiTenantDashboardLocators } from '../locators/multi-tenant-dashboard.locators';
import { SharedComponentLocators } from '../locators/shared-components.locators';

export class MultiTenantDashboardPage {
  constructor(private readonly page: Page) {}

  // --- Navigation ---

  /**
   * Navigates directly to the multi-tenant dashboard route.
   * Locator: MultiTenantDashboardLocators.breadcrumbDashboardLink
   */
  async goto(): Promise<void> {
    console.log('[MultiTenantDashboardPage] goto — start');
    await this.page.goto((process.env.APP_BASE_URL ?? '/') + '#/multi-tenant/dashboard');
    console.log('[MultiTenantDashboardPage] goto — done');
  }

  // --- Multi-Tenant Selection Dialog ---

  /**
   * Waits for the Multi-Tenant Selection popup dialog to appear after login.
   * Locator: MultiTenantDashboardLocators.tenantSelectionDialog
   */
  async waitForMultiTenantDialog(): Promise<void> {
    console.log('[MultiTenantDashboardPage] waitForMultiTenantDialog — start');
    await this.page.locator(MultiTenantDashboardLocators.tenantSelectionDialog).waitFor({ state: 'visible' });
    console.log('[MultiTenantDashboardPage] waitForMultiTenantDialog — done');
  }

  /**
   * Returns true if the Multi-Tenant Selection dialog is currently visible on the page.
   * Locator: MultiTenantDashboardLocators.tenantSelectionDialog
   */
  async isMultiTenantDialogVisible(): Promise<boolean> {
    console.log('[MultiTenantDashboardPage] isMultiTenantDialogVisible — start');
    const visible = await this.page.locator(MultiTenantDashboardLocators.tenantSelectionDialog).isVisible();
    console.log('[MultiTenantDashboardPage] isMultiTenantDialogVisible — done');
    return visible;
  }

  /**
   * Clicks the "Choose Your Tenant" dropdown/combobox inside the tenant selection dialog.
   * Locator: MultiTenantDashboardLocators.tenantSearchInput
   */
  async clickChooseTenantDropdown(): Promise<void> {
    console.log('[MultiTenantDashboardPage] clickChooseTenantDropdown — start');
    await this.page.locator(MultiTenantDashboardLocators.tenantSearchInput).click();
    console.log('[MultiTenantDashboardPage] clickChooseTenantDropdown — done');
  }

  /**
   * Types a search string into the tenant search input inside the selection dialog.
   * @param searchText - The tenant name or prefix to search for (e.g. "atm-a01").
   * Locator: MultiTenantDashboardLocators.tenantSearchInput
   */
  async searchTenant(searchText: string): Promise<void> {
    console.log('[MultiTenantDashboardPage] searchTenant — start');
    await this.page.locator(MultiTenantDashboardLocators.tenantSearchInput).fill(searchText);
    console.log('[MultiTenantDashboardPage] searchTenant — done');
  }

  /**
   * Selects a tenant option from the dropdown list by its exact visible text.
   * @param tenantName - The full display name of the tenant option.
   * Locator: MultiTenantDashboardLocators.tenantOptionsListbox (role=option)
   */
  async selectTenant(tenantName: string): Promise<void> {
    console.log('[MultiTenantDashboardPage] selectTenant — start');
    await this.page.getByRole('option', { name: tenantName }).click();
    console.log('[MultiTenantDashboardPage] selectTenant — done');
  }

  /**
   * Selects the first available tenant option from the currently opened dropdown list.
   * Locator: MultiTenantDashboardLocators.tenantOptionsListbox (role=listbox > option)
   */
  async selectFirstTenantOption(): Promise<void> {
    console.log('[MultiTenantDashboardPage] selectFirstTenantOption — start');
    const options = this.page.getByRole('option');
    await expect(options.first()).toBeVisible({ timeout: 10000 });
    await options.first().click();
    console.log('[MultiTenantDashboardPage] selectFirstTenantOption — done');
  }

  /**
   * Selects the first tenant option whose identifier (e.g. tenant ID) ends with the given suffix.
   * @param suffix - The suffix string the tenant ID must end with (e.g. "2397").
   * Locator: MultiTenantDashboardLocators.tenantOptionsListbox (role=listbox > option)
   */
  async selectTenantEndingWith(suffix: string): Promise<void> {
    console.log('[MultiTenantDashboardPage] selectTenantEndingWith — start');
    const options = this.page.getByRole('option');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text && text.trim().endsWith(suffix)) {
        await options.nth(i).click();
        console.log('[MultiTenantDashboardPage] selectTenantEndingWith — done');
        return;
      }
    }
    throw new Error(`No tenant option found ending with suffix: "${suffix}"`);
  }

  // --- Sidebar Navigation ---

  /**
   * Returns all sidebar navigation item labels from the hamburger/sidebar tree.
   * DevExtreme tree renders labels via Angular templates; text lives in img[title],
   * not in the treeitem's text content.
   * Locator: [role="treeitem"] img[title]
   */
  async getNavMenuItems(): Promise<string[]> {
    console.log('[MultiTenantDashboardPage] getNavMenuItems — start');
    const items = this.page.locator('[role="treeitem"]');
    const count = await items.count();
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      const title = await items.nth(i).locator('img').getAttribute('title');
      if (title?.trim()) labels.push(title.trim());
    }
    console.log('[MultiTenantDashboardPage] getNavMenuItems — done');
    return labels;
  }

  /**
   * Clicks a sidebar navigation item by its label text.
   * @param label - The nav item label (e.g. "Tenants", "Sites", "Geo Fence").
   * Locator: MultiTenantDashboardLocators.sidebarNavTree (role=treeitem)
   */
  async clickNavItem(label: string): Promise<void> {
    console.log('[MultiTenantDashboardPage] clickNavItem — start');
    await this.page.getByRole('treeitem', { name: label }).click();
    console.log('[MultiTenantDashboardPage] clickNavItem — done');
  }

  // --- Profile / Logout ---

  /**
   * Opens the top-right profile dropdown menu.
   * Locator: SharedComponentLocators.profileDropdownButton
   */
  async openProfileMenu(): Promise<void> {
    console.log('[MultiTenantDashboardPage] openProfileMenu — start');
    await this.page.locator(SharedComponentLocators.profileDropdownButton).click();
    await this.page.locator(SharedComponentLocators.profileSignoutItem).waitFor({ state: 'visible' });
    console.log('[MultiTenantDashboardPage] openProfileMenu — done');
  }

  /**
   * Clicks the "Signout" item inside the profile dropdown menu.
   * Locator: SharedComponentLocators.profileSignoutItem
   */
  async clickSignout(): Promise<void> {
    console.log('[MultiTenantDashboardPage] clickSignout — start');
    await this.page.locator(SharedComponentLocators.profileSignoutItem).click();
    console.log('[MultiTenantDashboardPage] clickSignout — done');
  }

  /**
   * Performs a full logout: opens the profile menu and clicks Signout.
   * Locators: SharedComponentLocators.profileDropdownButton, SharedComponentLocators.profileSignoutItem
   */
  async logout(): Promise<void> {
    console.log('[MultiTenantDashboardPage] logout — start');
    await this.openProfileMenu();
    await this.clickSignout();
    console.log('[MultiTenantDashboardPage] logout — done');
  }

  // --- Assertions ---

  /**
   * Asserts that the multi-tenant dashboard is loaded by checking the breadcrumb Dashboard link.
   * Locator: MultiTenantDashboardLocators.breadcrumbDashboardLink
   */
  async assertIsDashboard(): Promise<void> {
    console.log('[MultiTenantDashboardPage] assertIsDashboard — start');
    await expect(this.page).toHaveURL(/\/#\/multi-tenant\/dashboard/);
    console.log('[MultiTenantDashboardPage] assertIsDashboard — done');
  }

  /**
   * Asserts that the Multi-Tenant Selection dialog is visible with the expected heading.
   * Locator: MultiTenantDashboardLocators.tenantSelectionDialog
   */
  async assertMultiTenantDialogVisible(): Promise<void> {
    console.log('[MultiTenantDashboardPage] assertMultiTenantDialogVisible — start');
    await expect(this.page.locator(MultiTenantDashboardLocators.tenantSelectionDialog)).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Multi-Tenant Selection' })).toBeVisible();
    console.log('[MultiTenantDashboardPage] assertMultiTenantDialogVisible — done');
  }

  /**
   * Asserts that the selected tenant name is visible anywhere on the current page
   * (header ng-select, breadcrumb, or page content).
   * Uses page.getByText so it works regardless of which element renders the tenant name
   * on a given route.
   * @param expectedName - The tenant display name set during tenant selection.
   */
  async assertTenantInHeader(expectedName: string): Promise<void> {
    console.log('[MultiTenantDashboardPage] assertTenantInHeader — start');
    await expect(this.page.getByText(expectedName, { exact: false }).first()).toBeVisible({ timeout: 20000 });
    console.log('[MultiTenantDashboardPage] assertTenantInHeader — done');
  }

  /**
   * Switches the active tenant using the persistent header ng-select (not the login dialog).
   * Use this to restore tenant context between tests in a shared-session suite.
   * @param searchText - Text to type into the header combobox search (e.g. "ATm-A01").
   * @param suffix     - ID suffix to identify the correct option (e.g. "2397").
   * Locator: MultiTenantDashboardLocators.headerTenantSelector
   */
  async switchHeaderTenant(searchText: string, suffix: string): Promise<void> {
    console.log('[MultiTenantDashboardPage] switchHeaderTenant — start');
    // Use .first() to target the header input only (not the tenant dialog input if dialog is open)
    await this.page.locator(MultiTenantDashboardLocators.headerTenantInput).first().click();
    await this.page.locator(MultiTenantDashboardLocators.headerTenantInput).first().fill(searchText);
    const options = this.page.getByRole('option');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text && text.trim().includes(suffix)) {
        await options.nth(i).click();
        await this.page.waitForTimeout(800); // allow SPA to update breadcrumb context
        console.log('[MultiTenantDashboardPage] switchHeaderTenant — done');
        return;
      }
    }
    throw new Error(`No tenant option found containing suffix: "${suffix}"`);
  }

  /**
   * Switches the active tenant via the header ng-select by selecting the first visible option.
   * Useful when tenant order is stable but IDs are not.
   * Locator: MultiTenantDashboardLocators.headerTenantSelector (role=option)
   */
  async switchHeaderTenantToFirstOption(): Promise<void> {
    console.log('[MultiTenantDashboardPage] switchHeaderTenantToFirstOption — start');
    await this.page.locator(MultiTenantDashboardLocators.headerTenantInput).first().click();
    const options = this.page.getByRole('option');
    await expect(options.first()).toBeVisible({ timeout: 10000 });
    await options.first().click();
    await this.page.waitForTimeout(800); // allow SPA to update breadcrumb context
    console.log('[MultiTenantDashboardPage] switchHeaderTenantToFirstOption — done');
  }

  /**
   * Returns the currently selected tenant name from the header ng-select.
   * Waits up to 10 s for the Angular component to render the selected value.
   * Locator: MultiTenantDashboardLocators.headerTenantNameText
   */
  async getSelectedTenantName(): Promise<string> {
    const el = this.page.locator(MultiTenantDashboardLocators.headerTenantNameText).first();
    await el.waitFor({ state: 'visible', timeout: 10000 });
    return (await el.textContent()) ?? '';
  }

  /**
   * Returns the page title for assertion use.
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }
}
