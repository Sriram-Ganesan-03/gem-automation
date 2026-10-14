import { expect, Locator, Page } from '@playwright/test';
import { bucketConfigRuntime } from '../config/bucket-config-runtime';
import { BucketConfigLocators } from '../locators/bucket-config.locators';
import { resolveLocator } from '../locators/resolve-locator';

export class BucketConfigPage {
  constructor(private readonly page: Page) {}

  private locator(selector: string): Locator {
    return this.page.locator(resolveLocator(selector, bucketConfigRuntime.appVersion));
  }

  async goto(): Promise<void> {
    await this.page.goto(bucketConfigRuntime.launchUrl);
    await expect(this.locator(BucketConfigLocators.usernameInput)).toBeVisible();
  }

  async signIn(): Promise<void> {
    const directLoginButton = this.locator(BucketConfigLocators.directLoginButton);
    if (await directLoginButton.isVisible()) await directLoginButton.click();

    await this.locator(BucketConfigLocators.usernameInput).fill(bucketConfigRuntime.username);
    await this.locator(BucketConfigLocators.passwordInput).fill(bucketConfigRuntime.password);
    const signInButton = this.locator(BucketConfigLocators.signInButton);
    await expect(
      await signInButton.evaluate((button) => (button as HTMLButtonElement).form?.checkValidity()),
      'The login form must be valid before submission.',
    ).toBe(true);
    await signInButton.evaluate((button) => (button as HTMLButtonElement).click());
  }

  async handleLoginOutcome(): Promise<void> {
    const dialog = this.locator(BucketConfigLocators.existingSessionDialog);
    const outcome = await Promise.race([
      this.locator(BucketConfigLocators.dashboardLabel)
        .waitFor({ state: 'visible', timeout: 45000 })
        .then(() => 'dashboard'),
      dialog.waitFor({ state: 'visible', timeout: 45000 }).then(() => 'session-dialog'),
    ]);

    if (outcome === 'session-dialog') {
      await this.locator(BucketConfigLocators.existingSessionContinueButton).click();
      await expect(dialog).toBeHidden({ timeout: 20000 });
    }
    await expect(this.locator(BucketConfigLocators.dashboardLabel)).toBeVisible({
      timeout: 45000,
    });
  }

  async openBucketConfig(): Promise<void> {
    const gemNavigationItem = this.locator(BucketConfigLocators.gemNavigationItem);
    await gemNavigationItem.click({ force: true });
    await this.page.waitForTimeout(500);

    const gemMenu = gemNavigationItem.locator('xpath=../..');
    const configurations = gemMenu.locator(
      resolveLocator(BucketConfigLocators.configurationsMenuItem, bucketConfigRuntime.appVersion),
    );
    await configurations.click({ force: true });
    await this.page.waitForTimeout(500);

    const bucketConfigLink = this.locator(BucketConfigLocators.bucketConfigMenuItem);
    await expect(bucketConfigLink).toBeVisible();
    await bucketConfigLink.click();
    await expect(this.page).toHaveURL(/\/marketing\/gem\/bucket-config$/);
    await expect(this.locator(BucketConfigLocators.addButton)).toBeVisible();
  }

  async openCreateForm(): Promise<void> {
    await this.locator(BucketConfigLocators.addButton).click();
    await expect(this.locator(BucketConfigLocators.createBucketConfigHeading)).toBeVisible();
  }

  async fillBucketName(value: string): Promise<void> {
    await this.locator(BucketConfigLocators.bucketNameInput).fill(value);
  }

  async fillBucketCode(value: string): Promise<void> {
    await this.locator(BucketConfigLocators.bucketCodeInput).fill(value);
  }

  async selectBucketType(value: string): Promise<void> {
    await this.selectOption(BucketConfigLocators.bucketTypeDropdown, value);
  }

  async selectStatus(value: string): Promise<void> {
    await this.selectOption(BucketConfigLocators.statusDropdown, value);
  }

  private async selectOption(dropdownSelector: string, value: string): Promise<void> {
    const dropdown = this.locator(dropdownSelector);
    await dropdown.click();

    const option = this.page.getByRole('option', { name: value, exact: true });
    if (await option.count()) {
      await option.click();
    } else {
      await this.page.getByText(value, { exact: true }).last().click();
    }

    const selectedValue = await dropdown.evaluate((element) => {
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      ) {
        return element.value;
      }
      return element.textContent?.trim() ?? '';
    });
    expect(selectedValue).toContain(value);
  }

  async assertMandatoryFieldsAreFilled(): Promise<void> {
    for (const label of ['Bucket Name *', 'Bucket Code *', 'Bucket Type *', 'Status *']) {
      await expect(this.page.getByText(label, { exact: true })).toBeVisible();
    }

    const name = await this.locator(BucketConfigLocators.bucketNameInput).inputValue();
    const code = await this.locator(BucketConfigLocators.bucketCodeInput).inputValue();
    const type = await this.selectedValue(BucketConfigLocators.bucketTypeDropdown);
    const status = await this.selectedValue(BucketConfigLocators.statusDropdown);
    expect([name, code, type, status].every((value) => value.trim().length > 0)).toBe(true);
  }

  async assertFormValues(name: string, code: string): Promise<void> {
    await expect(this.locator(BucketConfigLocators.bucketNameInput)).toHaveValue(name);
    await expect(this.locator(BucketConfigLocators.bucketCodeInput)).toHaveValue(code);
    await expect(this.locator(BucketConfigLocators.createBucketConfigHeading)).toBeVisible();
  }

  async saveConfiguration(): Promise<void> {
    await this.locator(BucketConfigLocators.saveConfigurationButton).click();
    await expect(this.locator(BucketConfigLocators.createBucketConfigHeading)).toBeHidden({
      timeout: 20000,
    });
  }

  async configurationExists(name: string): Promise<boolean> {
    await this.locator(BucketConfigLocators.searchInput).fill(name);
    await this.page.waitForTimeout(700);
    const row = this.page.getByRole('row').filter({ hasText: name }).first();
    return (await row.count()) > 0;
  }

  private async selectedValue(selector: string): Promise<string> {
    return this.locator(selector).evaluate((element) => {
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      ) {
        return element.value;
      }
      return element.textContent?.trim() ?? '';
    });
  }

  async assertConfigurationInListing(
    name: string,
    code: string,
    type: string,
    status: string,
  ): Promise<void> {
    const search = this.locator(BucketConfigLocators.searchInput).first();
    if (await search.count()) await search.fill(name);

    const row = this.page.getByRole('row').filter({ hasText: name }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText(code);
    await expect(row).toContainText(new RegExp(type, 'i'));
    await expect(row).toContainText(status);
  }
}
