// pages/login.page.ts
// Page Object — Login Page (Keycloak: Sign in to TrilogyGo)
// Route: /auth/realms/TrilogyGo/protocol/openid-connect/auth
import { Page, expect } from '@playwright/test';
import { LoginLocators } from '../locators/login.locators';
import { config } from '../config/test-config';

export class LoginPage {
  constructor(private readonly page: Page) {}

  // --- Navigation ---

  /**
   * Navigates to the application root, which redirects to the Keycloak login page.
   * Waits for the username input to be visible before returning.
   * Locator: LoginLocators.usernameInput
   */
  async goto(): Promise<void> {
    console.log('[LoginPage] goto — start');
    await this.page.goto(config.baseUrl);
    await this.page.locator(LoginLocators.usernameInput).waitFor({ state: 'visible' });
    console.log('[LoginPage] goto — done');
  }

  /**
   * Navigates back in browser history (used to verify post-logout back-button behaviour).
   */
  async navigateBack(): Promise<void> {
    console.log('[LoginPage] navigateBack — start');
    await this.page.goBack();
    console.log('[LoginPage] navigateBack — done');
  }

  // --- Logout Confirmation (Keycloak "Logging out" page) ---

  /**
   * Completes the Keycloak logout flow. After Signout the app lands on a "Logging out"
   * confirmation page ("Do you want to log out?") — this clicks its "Logout" button so
   * the app finishes signing out and returns to the login page.
   * If the confirmation page is not shown (e.g. the session already fully ended), this is
   * a no-op so callers can always chain it before asserting the login page.
   * Locator: LoginLocators.logoutConfirmButton
   */
  async confirmLogout(): Promise<void> {
    console.log('[LoginPage] confirmLogout — start');
    const logoutButton = this.page.locator(LoginLocators.logoutConfirmButton);
    try {
      await logoutButton.waitFor({ state: 'visible', timeout: 8000 });
      await logoutButton.click();
    } catch {
      console.log('[LoginPage] confirmLogout — no confirmation page shown, skipping');
    }
    console.log('[LoginPage] confirmLogout — done');
  }

  // --- Form Inputs ---

  /**
   * Fills the username (or email) field on the Keycloak login form.
   * @param value - The username string to enter.
   * Locator: LoginLocators.usernameInput
   */
  async fillUsername(value: string): Promise<void> {
    console.log('[LoginPage] fillUsername — start');
    await this.page.locator(LoginLocators.usernameInput).fill(value);
    console.log('[LoginPage] fillUsername — done');
  }

  /**
   * Fills the password field on the Keycloak login form.
   * @param value - The password string to enter.
   * Locator: LoginLocators.passwordInput
   */
  async fillPassword(value: string): Promise<void> {
    console.log('[LoginPage] fillPassword — start');
    await this.page.locator(LoginLocators.passwordInput).fill(value);
    console.log('[LoginPage] fillPassword — done');
  }

  // --- Actions ---

  /**
   * Clicks the "Sign In" submit button to authenticate.
   * Waits for navigation away from the login page.
   * Locator: LoginLocators.signInButton
   */
  async clickSignIn(): Promise<void> {
    console.log('[LoginPage] clickSignIn — start');
    await this.page.locator(LoginLocators.signInButton).click();
    console.log('[LoginPage] clickSignIn — done');
  }

  /**
   * Performs a full login flow: fills username, fills password, then clicks Sign In.
   * @param username - The username or email address.
   * @param password - The account password.
   * Locators: LoginLocators.usernameInput, LoginLocators.passwordInput, LoginLocators.signInButton
   */
  async login(username: string, password: string): Promise<void> {
    console.log('[LoginPage] login — start');
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.clickSignIn();
    console.log('[LoginPage] login — done');
  }

  // --- Assertions ---

  /**
   * Asserts that the current page is the login page by checking the Sign In heading.
   * Locator: heading "Sign In"
   */
  async assertIsLoginPage(): Promise<void> {
    console.log('[LoginPage] assertIsLoginPage — start');
    await expect(this.page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    console.log('[LoginPage] assertIsLoginPage — done');
  }

  /**
   * Returns the current page title for assertion use.
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }
}
