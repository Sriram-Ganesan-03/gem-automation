import { Page } from '@playwright/test';
import { config } from '../config/test-config';
import { resolveLocator } from '../locators/resolve-locator';
import { ChickasawLoginLocators } from '../locators/chickasaw-login.locators';

export class ChickasawLoginPage {
  constructor(private readonly page: Page) {}

  /**
   * Opens the configured Chickasaw portal login page.
   * Locator: ChickasawLoginLocators.emailInput
   */
  async goto(): Promise<void> {
    await this.page.goto(config.baseUrl);
    await this.page
      .getByRole('button', {
        name: resolveLocator(ChickasawLoginLocators.useDirectLoginButton, config.appVersion),
      })
      .waitFor({ state: 'visible' });
  }

  /**
   * Selects direct login before credentials are entered.
   * Locator: ChickasawLoginLocators.useDirectLoginButton
   */
  async selectDirectLogin(): Promise<void> {
    await this.page.getByRole('button', {
      name: resolveLocator(ChickasawLoginLocators.useDirectLoginButton, config.appVersion),
    }).click();
    await this.page
      .getByRole('textbox', {
        name: resolveLocator(ChickasawLoginLocators.emailInput, config.appVersion),
        exact: true,
      })
      .waitFor({ state: 'visible' });
  }

  /**
   * Enters the configured username and password and submits the login form.
   * Locators: ChickasawLoginLocators.emailInput, passwordInput, signInButton
   */
  async signIn(): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: resolveLocator(ChickasawLoginLocators.emailInput, config.appVersion),
        exact: true,
      })
      .fill(config.username);
    await this.page
      .getByRole('textbox', {
        name: resolveLocator(ChickasawLoginLocators.passwordInput, config.appVersion),
        exact: true,
      })
      .fill(config.password);
    await this.page
      .getByRole('button', {
        name: resolveLocator(ChickasawLoginLocators.signInButton, config.appVersion),
        exact: true,
      })
      .click();
  }

  /**
   * Continues an existing session only when the confirmation prompt appears.
   * Locators: ChickasawLoginLocators.existingSessionPrompt and continueExistingSessionButton
   */
  async continueExistingSessionIfPrompted(): Promise<void> {
    const prompt = this.page.getByText(
      resolveLocator(ChickasawLoginLocators.existingSessionPrompt, config.appVersion),
      { exact: true },
    );

    try {
      await prompt.waitFor({ state: 'visible', timeout: 3000 });
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'TimeoutError') {
        throw error;
      }
    }

    if (await prompt.isVisible()) {
      await this.page
        .getByRole('button', {
          name: resolveLocator(ChickasawLoginLocators.continueExistingSessionButton, config.appVersion),
          exact: true,
        })
        .click();
      await prompt.waitFor({ state: 'hidden' });
    }
  }
}
