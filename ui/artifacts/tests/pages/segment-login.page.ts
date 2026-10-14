import { expect, Page } from '@playwright/test';
import { segmentTestConfig } from '../config/segment-test-config';
import { SegmentLoginLocators } from '../locators/segment-login.locators';

export class SegmentLoginPage {
  constructor(private readonly page: Page) {}

  /** Opens the direct login page. */
  async open(): Promise<void> {
    await this.page.goto(segmentTestConfig.baseUrl);
    await this.page.getByRole('button', { name: SegmentLoginLocators.directLoginButton }).click();
    await expect(this.page.getByRole('textbox', { name: SegmentLoginLocators.emailInput })).toBeVisible();
  }

  /** Submits the configured user credentials. */
  async signIn(): Promise<void> {
    await this.page.getByRole('textbox', { name: SegmentLoginLocators.emailInput }).fill(segmentTestConfig.username);
    await this.page.getByRole('textbox', { name: SegmentLoginLocators.passwordInput }).fill(segmentTestConfig.password);
    await this.page.getByRole('button', { name: SegmentLoginLocators.signInButton }).click();
  }

  /** Approves the explicitly authorized existing-session logout when the app requires it. */
  async approveExistingSessionLogoutIfRequested(): Promise<void> {
    const confirmation = this.page.getByRole('alertdialog', { name: SegmentLoginLocators.existingSessionDialog });
    const dashboard = this.page.getByText('Welcome To Chickasaw Nation - Playerhub');
    await expect(confirmation.or(dashboard)).toBeVisible({ timeout: 15000 });
    if (await confirmation.isVisible()) {
      await confirmation.getByRole('button', { name: SegmentLoginLocators.approveExistingSessionButton }).click();
    }
  }

  /** Verifies that the dashboard route is displayed after authentication. */
  async expectDashboardDisplayed(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard(?:[/?#]|$)/);
    await expect(this.page.getByText('Welcome To Chickasaw Nation - Playerhub')).toBeVisible();
  }
}
