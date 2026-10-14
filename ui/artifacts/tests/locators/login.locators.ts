// locators/login.locators.ts
// Object Repository — Login Page (Keycloak: Sign in to TrilogyGo)
// Route: /auth/realms/TrilogyGo/protocol/openid-connect/auth
// NO Playwright imports — pure TypeScript constants

export const LoginLocators = {
  // --- Form Inputs ---
  usernameInput:         '#username',
  passwordInput:         '#password',

  // --- Actions ---
  signInButton:          '#kc-login',
  microsoftSignInLink:   'a[href*="broker/igt_microsoft_login"]',

  // --- Container ---
  loginForm:             '#kc-form-login',
  loginCard:             '#kc-content',

  // --- Keycloak Logout Confirmation ("Logging out" page) ---
  // Shown after clicking Signout in the app; requires clicking the Logout button
  // to complete sign-out and return to the login page.
  logoutConfirmHeading:  'h1:has-text("Logging out")',
  logoutConfirmButton:   '#kc-logout',
  backToApplicationLink: 'a:has-text("Back to Application")',
} as const;
