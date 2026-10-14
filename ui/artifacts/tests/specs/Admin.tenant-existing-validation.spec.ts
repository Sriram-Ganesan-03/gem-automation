// tests/specs/Admin.tenant-existing-validation.spec.ts
//
// Scenario source: raw-file — .github/ui/input.txt
// Scenario title:  Validation of Existing Tenant
//
// Goal: a user must NOT be able to create a tenant that already exists.
//
// Flow covered:
//   1. Sign in to TrilogyGo as `admin` via Keycloak.
//   2. Verify the app redirects to the appropriate landing page.
//   3. Complete the Multi-Tenant Selection dialog (search + suffix from config).
//   4. Go to the Tenants List, search for the currently-selected tenant.
//   5. Open it for editing and capture Name / Trilogy Domain / Trilogy Go
//      Domain / Description locally.
//   6. Go back to the Tenants List and open the Create form via the + icon.
//   7. Enter the captured values and click Save.
//   8. Assert the "Tenant Already Exists" error is shown (create rejected).
//   9. Sign out via the profile menu and verify redirect to the login page.
import { test, expect } from '../support/test';
import { config } from '../config/test-config';
import { LoginPage } from '../pages/login.page';
import { MultiTenantSelectionDialogPage } from '../pages/multi-tenant-selection-dialog.page';
import { DashboardPage } from '../pages/dashboard.page';
import { TenantsPage } from '../pages/tenants.page';
import { TenantFormPage } from '../pages/tenant-form.page';
import { MultiTenantDashboardPage } from '../pages/multi-tenant-dashboard.page';

test.describe('Validation of Existing Tenant', () => {
  let login: LoginPage;
  let dialog: MultiTenantSelectionDialogPage;
  let dash: DashboardPage;
  let tenants: TenantsPage;
  let form: TenantFormPage;
  let dashboardPage: MultiTenantDashboardPage;

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    login = new LoginPage(page);
    dialog = new MultiTenantSelectionDialogPage(page);
    dash = new DashboardPage(page);
    tenants = new TenantsPage(page);
    form = new TenantFormPage(page);
    dashboardPage = new MultiTenantDashboardPage(page);
  });

  // Source: raw-file .github/ui/input.txt — "Validation of Existing Tenant"
  test('rejects creating a tenant that already exists', async ({ page }) => {
    test.setTimeout(120000);

    await test.step('Launch TrilogyGo and sign in as admin', async () => {
      console.log('\u25B6 Launch TrilogyGo and sign in as admin');
      await login.goto();
      await login.fillUsername(config.username);
      await login.fillPassword(config.password);
      await login.clickSignIn();
    });

    await test.step('Multi-Tenant Selection popup appears', async () => {
      console.log('\u25B6 Multi-Tenant Selection popup appears');
      await dialog.waitUntilVisible();
    });

    await test.step('Choose the Tenant from the dropdown', async () => {
      console.log('\u25B6 Choose the Tenant from the dropdown');
      await dialog.chooseTenant(config.tenantSearchTerm, config.tenantIdSuffix);
      await dash.waitUntilLoaded();
    });

    await test.step('Navigate to the Tenants List page', async () => {
      console.log('\u25B6 Navigate to the Tenants List page');
      await dash.sidebar.clickItem('Tenants');
      await tenants.waitUntilLoaded();
    });

    // Capture the currently-selected tenant's field values from its Edit form.
    const existing = { name: '', trilogyGoDomain: '', trilogyDomain: '', description: '' };

    await test.step('Search for the selected tenant and open it for editing', async () => {
      console.log('\u25B6 Search for the selected tenant and open it for editing');
      await tenants.search(config.tenantSearchTerm);
      await tenants.clickEditForFirstRow();
      await form.waitUntilLoaded();
    });

    await test.step('Capture Name, Trilogy Domain, Trilogy Go Domain and Description', async () => {
      console.log('\u25B6 Capture existing tenant field values');
      const captured = await form.captureValues();
      Object.assign(existing, captured);
      expect(existing.name.length).toBeGreaterThan(0);
    });

    await test.step('Return to the Tenants List', async () => {
      console.log('\u25B6 Return to the Tenants List');
      await form.clickCancel();
      await tenants.waitUntilLoaded();
    });

    await test.step('Open the Create Tenant form via the + icon', async () => {
      console.log('\u25B6 Open the Create Tenant form via the + icon');
      await tenants.openCreateForm();
      await form.waitUntilLoaded();
    });

    await test.step('Enter the captured (existing) tenant details and Save', async () => {
      console.log('\u25B6 Enter the captured (existing) tenant details and Save');
      await form.fillCreateForm({
        name: existing.name,
        trilogyGoDomain: existing.trilogyGoDomain,
        trilogyDomain: existing.trilogyDomain,
        description: existing.description,
      });
      await form.clickSave();
    });

    await test.step('Verify the "Tenant Already Exists" error is shown', async () => {
      console.log('\u25B6 Verify the "Tenant Already Exists" error is shown');
      await form.assertDuplicateTenantError();
    });

    await test.step('Sign out via the profile menu', async () => {
      console.log('\u25B6 Sign out via the profile menu');
      await dashboardPage.logout();
      await login.confirmLogout();
      await login.assertIsLoginPage();
    });

    await test.step('User is redirected back to the login page', async () => {
      console.log('\u25B6 User is redirected back to the login page');
      await login.assertOnLoginPage();
    });
  });
});
