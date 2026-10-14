import { expect, Page } from '@playwright/test';
import { GamificationLocators } from '../locators/gamification.locators';

export class GamificationPage {
  constructor(private readonly page: Page) {}

  async login(username: string, password: string): Promise<void> {
    await this.page.goto('/auth/login');

    const emailInput = this.page.getByRole('textbox', {
      name: GamificationLocators.loginEmailName,
    });
    if (!(await emailInput.isVisible())) {
      await this.page
        .getByRole('button', { name: GamificationLocators.directLoginButtonName })
        .click();
    }

    await expect(emailInput).toBeVisible();
    await this.page
      .getByRole('textbox', { name: GamificationLocators.loginPasswordName })
      .fill(password);
    await emailInput.fill(username);
    await this.page
      .getByRole('textbox', { name: GamificationLocators.loginPasswordName })
      .press('Enter');

    const sessionDialog = this.page.getByRole('alertdialog', {
      name: GamificationLocators.sessionConfirmationName,
    });
    const outcome = await Promise.race([
      this.page.waitForURL(/\/dashboard$/, { timeout: 45000 }).then(() => 'dashboard'),
      sessionDialog.waitFor({ state: 'visible', timeout: 45000 }).then(() => 'confirmation'),
    ]);

    if (outcome === 'confirmation') {
      await sessionDialog
        .getByRole('button', { name: GamificationLocators.confirmSessionButtonName })
        .click();
      await expect(this.page).toHaveURL(/\/dashboard$/, { timeout: 45000 });
    }
  }

  async openGamification(): Promise<void> {
    const link = this.page.locator(GamificationLocators.gamificationNavLink);
    await expect(link).toBeAttached();
    await link.evaluate((element: HTMLAnchorElement) => element.click());
    await expect(this.page).toHaveURL(/\/marketing\/gem\/gamification$/);
    await expect(this.page.getByRole('heading', { name: 'Gamification Management' })).toBeVisible();
  }

  async openCreateGame(): Promise<void> {
    await this.page.locator(GamificationLocators.addGameButton).click();
    await expect(
      this.page.getByRole('heading', { name: GamificationLocators.createGameHeading }),
    ).toBeVisible();
  }

  async fillGameName(name: string): Promise<void> {
    await this.page
      .getByPlaceholder(GamificationLocators.gameNamePlaceholder)
      .fill(name);
  }

  async setPrize(index: number, label: string, imageUrl: string): Promise<void> {
    const prizeLabel = this.page.getByPlaceholder(GamificationLocators.prizeLabelPlaceholder);
    const prizeImage = this.page.getByPlaceholder(GamificationLocators.prizeImageUrlPlaceholder);

    if (index > 0) {
      await this.page
        .getByRole('button', { name: GamificationLocators.addPrizeButtonName })
        .click();
    }

    await prizeLabel.nth(index).fill(label);
    await prizeImage.nth(index).fill(imageUrl);
  }

  async addEmptyPrize(): Promise<void> {
    await this.page
      .getByRole('button', { name: GamificationLocators.addPrizeButtonName })
      .click();
  }

  async assertPrizeCount(count: number): Promise<void> {
    const label = `${count} ${count === 1 ? 'Prize' : 'Prizes'}`;
    await expect(this.page.getByText(label, { exact: true })).toBeVisible();
  }

  async assertPrizeDetails(label: string, imageUrl: string, index: number): Promise<void> {
    await expect(
      this.page.getByPlaceholder(GamificationLocators.prizeLabelPlaceholder).nth(index),
    ).toHaveValue(label);
    await expect(
      this.page.getByPlaceholder(GamificationLocators.prizeImageUrlPlaceholder).nth(index),
    ).toHaveValue(imageUrl);
  }

  async removePrize(index: number): Promise<void> {
    await this.page
      .getByRole('button', { name: GamificationLocators.removePrizeButtonName })
      .nth(index)
      .click();
  }

  async assertPrizeRemoveControls(count: number): Promise<void> {
    await expect(
      this.page.getByRole('button', { name: GamificationLocators.removePrizeButtonName }),
    ).toHaveCount(count);
  }

  async saveConfiguration(): Promise<void> {
    await this.page
      .getByRole('button', { name: GamificationLocators.saveConfigurationButtonName })
      .click();
  }

  async findSavedGame(name: string): Promise<string> {
    await this.page
      .getByPlaceholder(GamificationLocators.savedGameSearchPlaceholder)
      .fill(name);
    const row = this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name, exact: true }) })
      .first();
    await expect(row).toBeVisible();
    return row.innerText();
  }
}
