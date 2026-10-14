import { expect, Locator, Page } from '@playwright/test';
import { bucketConfigRuntime } from '../config/bucket-config-runtime';
import { RewardConfigLocators } from '../locators/reward-config.locators';
import { resolveLocator } from '../locators/resolve-locator';

export class RewardConfigPage {
  constructor(private readonly page: Page) {}

  private locator(selector: string): Locator {
    return this.page.locator(resolveLocator(selector, bucketConfigRuntime.appVersion));
  }

  async goto(): Promise<void> {
    await this.page.goto(bucketConfigRuntime.launchUrl);
    await expect(this.locator(RewardConfigLocators.usernameInput)).toBeVisible();
  }

  async signIn(): Promise<void> {
    const directLoginButton = this.locator(RewardConfigLocators.directLoginButton);
    if (await directLoginButton.isVisible()) await directLoginButton.click();

    await this.locator(RewardConfigLocators.usernameInput).fill(bucketConfigRuntime.username);
    await this.locator(RewardConfigLocators.passwordInput).fill(bucketConfigRuntime.password);
    const signInButton = this.locator(RewardConfigLocators.signInButton);
    await expect(
      await signInButton.evaluate((button) => (button as HTMLButtonElement).form?.checkValidity()),
      'The login form must be valid before submission.',
    ).toBe(true);
    await signInButton.evaluate((button) => (button as HTMLButtonElement).click());
  }

  async handleLoginOutcome(): Promise<void> {
    const dialog = this.locator(RewardConfigLocators.existingSessionDialog);
    const outcome = await Promise.race([
      this.locator(RewardConfigLocators.dashboardLabel)
        .waitFor({ state: 'visible', timeout: 45000 })
        .then(() => 'dashboard'),
      dialog.waitFor({ state: 'visible', timeout: 45000 }).then(() => 'session-dialog'),
    ]);

    if (outcome === 'session-dialog') {
      await this.locator(RewardConfigLocators.existingSessionContinueButton).click();
      await expect(dialog).toBeHidden({ timeout: 20000 });
    }
    await expect(this.locator(RewardConfigLocators.dashboardLabel)).toBeVisible({
      timeout: 45000,
    });
  }

  async openRewardConfig(): Promise<void> {
    const rewardMenuItem = this.locator(RewardConfigLocators.rewardMenuItem);
    const menuSearch = this.locator(RewardConfigLocators.menuSearchInput);
    await menuSearch.fill('Reward');
    await expect(rewardMenuItem).toBeVisible();
    await rewardMenuItem.click();
    if (!this.page.url().includes('/marketing/gem/reward-config')) {
      await this.page.goto(new URL('/marketing/gem/reward-config', this.page.url()).toString());
    }
    await expect(this.page).toHaveURL(/\/marketing\/gem\/reward-config(?:[/?#]|$)/);
    await this.page.locator('.global-spinner-overlay').waitFor({ state: 'hidden', timeout: 30000 });
    await expect(this.locator(RewardConfigLocators.addButton)).toBeVisible();
  }

  async openCreateForm(): Promise<void> {
    if (!this.page.url().includes('/marketing/gem/reward-config')) {
      await this.page.goto(new URL('/marketing/gem/reward-config', this.page.url()).toString());
    }
    await this.page.locator('.global-spinner-overlay').waitFor({ state: 'hidden', timeout: 30000 });
    await this.locator(RewardConfigLocators.addButton).click();
    await expect(this.locator(RewardConfigLocators.createRewardConfigHeading)).toBeVisible();
  }

  async fillRewardName(name: string): Promise<void> {
    const rewardNameInput = this.locator(RewardConfigLocators.rewardNameInput);
    await expect(
      rewardNameInput,
      'Reward Name was not rendered after selecting the reward category.',
    ).toBeVisible();
    await rewardNameInput.fill(name);
  }

  async selectRewardCategory(value: string): Promise<void> {
    await this.selectOptionByLabel('Reward Category', value);
  }

  async selectRewardUnit(value: string): Promise<void> {
    await this.selectOptionByLabel('Reward Unit', value);
  }

  async selectTargetBucketPool(value: string): Promise<void> {
    await this.selectOptionByLabel('Target Bucket Pool', value);
  }

  async selectStatus(value: string): Promise<void> {
    await this.selectOptionByLabel('Status', value);
  }

  private async selectOptionByLabel(fieldLabel: string, value: string): Promise<void> {
    const dropdown = this.dropdownForField(fieldLabel);
    await expect(dropdown).toBeVisible();
    await dropdown.click();

    const option = this.page.getByRole('option', { name: value, exact: true });
    if (await option.count()) {
      await option.click();
    } else {
      await this.page.getByText(value, { exact: true }).last().click();
    }

    await expect(dropdown).toContainText(value);
  }

  async assertMandatoryFieldsAreFilled(): Promise<void> {
    for (const label of [
      'Reward Category *',
      'Reward Name *',
      'Reward Unit *',
      'Target Bucket Pool *',
      'Status *',
    ]) {
      await expect(this.page.getByText(label, { exact: true })).toBeVisible();
    }

    const values = await Promise.all([
      this.dropdownForField('Reward Category').innerText(),
      this.locator(RewardConfigLocators.rewardNameInput).inputValue(),
      this.dropdownForField('Reward Unit').innerText(),
      this.dropdownForField('Target Bucket Pool').innerText(),
      this.dropdownForField('Status').innerText(),
    ]);
    expect(values.every((value) => value.trim().length > 0)).toBe(true);
  }

  async assertFormValues(
    category: string,
    name: string,
    unit: string,
    bucketPool: string,
    status: string,
  ): Promise<void> {
    await expect(this.dropdownForField('Reward Category')).toContainText(category);
    await expect(this.locator(RewardConfigLocators.rewardNameInput)).toHaveValue(name);
    await expect(this.dropdownForField('Reward Unit')).toContainText(unit);
    await expect(this.dropdownForField('Target Bucket Pool')).toContainText(bucketPool);
    await expect(this.dropdownForField('Status')).toContainText(status);
  }

  async saveConfiguration(): Promise<void> {
    await this.locator(RewardConfigLocators.saveConfigurationButton).click();
    await expect(this.locator(RewardConfigLocators.createRewardConfigHeading)).toBeHidden({
      timeout: 20000,
    });
  }

  async assertConfigurationInListing(
    category: string,
    name: string,
    unit: string,
    bucketPool: string,
    status: string,
  ): Promise<void> {
    const search = this.locator(RewardConfigLocators.searchInput).first();
    if (await search.count()) await search.fill(name);

    const row = this.page
      .getByRole('row')
      .filter({ hasText: name })
      .filter({ hasText: /\bActive\b/ })
      .first();
    await expect(row).toBeVisible({ timeout: 20000 });
    for (const value of [name, unit, status]) {
      await expect(row).toContainText(value);
    }

    await row.getByRole('button').click();
    await row.getByText('Edit', { exact: true }).evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    await this.assertSavedValues(category, name, unit, bucketPool, status);
  }

  private async assertSavedValues(
    category: string,
    name: string,
    unit: string,
    bucketPool: string,
    status: string,
  ): Promise<void> {
    await expect(this.locator(RewardConfigLocators.editRewardConfigHeading)).toBeVisible();
    await expect(this.locator(RewardConfigLocators.editRewardNameInput)).toHaveValue(name);

    await expect(this.dropdownForField('Reward Category')).toContainText(category);
    await expect(this.dropdownForField('Reward Unit')).toContainText(unit);
    await expect(this.dropdownForField('Target Bucket Pool')).toContainText(bucketPool);
    await expect(this.dropdownForField('Status')).toContainText(status);
  }

  private dropdownForField(fieldLabel: string): Locator {
    return this.page
      .locator('label')
      .filter({ hasText: fieldLabel })
      .locator('xpath=following-sibling::p-dropdown')
      .getByRole('combobox');
  }

}
