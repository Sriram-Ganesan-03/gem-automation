// tests/specs/geo-fence-crud-operations.spec.ts
//
// Source: raw-file — .github/ui/input.txt
// Story:  Geo Fence CRUD Operations (Create → Read → Update → Delete → Sign out)
//
// End-to-end flow covered:
//   1. Sign in to TrilogyGo as `admin` via Keycloak.
//   2. Complete the Multi-Tenant Selection dialog (tenantSearchTerm / tenantIdSuffix from config).
//   3. Navigate to the Geo Fence page via the sidebar.
//   4. Read  : tenant selector is populated from the Dashboard; Site defaults to "All Properties";
//              select the first real Site to enable the grid.
//   5. Create: open the Create dialog, name it, search a location (Google Places), radius = 10, Save.
//   6. Update: search the new fence, edit it, change radius 10 → 20, screenshot, Save.
//   7. Delete: search the new fence, delete + confirm (YES), then re-search and assert it is gone.
//   8. Sign out via the profile menu; confirm the Keycloak "Logout" step; verify redirect.
//
// A runtime-unique fence name (Date.now()) keeps each run idempotent.
import { test, expect } from '@playwright/test';
import { config } from '../config/test-config';
import { LoginPage } from '../pages/login.page';
import { MultiTenantSelectionDialogPage } from '../pages/multi-tenant-selection-dialog.page';
import { DashboardPage } from '../pages/dashboard.page';
import { GeoFencePage } from '../pages/geo-fence.page';

test.describe('Geo Fence CRUD Operations', () => {
  let login: LoginPage;
  let dialog: MultiTenantSelectionDialogPage;
  let dash: DashboardPage;
  let geoFence: GeoFencePage;

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    login    = new LoginPage(page);
    dialog   = new MultiTenantSelectionDialogPage(page);
    dash     = new DashboardPage(page);
    geoFence = new GeoFencePage(page);
  });

  // Source: input.txt | Scenario: Geo Fence CRUD Operations
  test('creates, reads, updates, and deletes a geo fence, then signs out', async ({ page }) => {

    const ts            = Date.now();
    // NOTE: the Name field rejects special characters (e.g. "_"), so use spaces only.
    const fenceName     = `Test Geo Fence QA ${ts}`;
    const searchTerm    = 'Las Vegas';
    const initialRadius = 10;
    const updatedRadius = 20;

    await test.step('Launch TrilogyGo and sign in as admin', async () => {
      console.log('▶ Launch TrilogyGo and sign in as admin');
      await login.goto();
      await login.fillUsername(config.username);
      await login.fillPassword(config.password);
      await login.clickSignIn();
    });

    await test.step('Validate redirect to the landing page after authentication', async () => {
      console.log('▶ Validate redirect to the landing page after authentication');
      await expect(page).toHaveURL(/#\/multi-tenant\/dashboard/);
    });

    await test.step('Multi-Tenant Selection popup appears', async () => {
      console.log('▶ Multi-Tenant Selection popup appears');
      await dialog.waitUntilVisible();
    });

    await test.step('Choose the tenant from config', async () => {
      console.log('▶ Choose the tenant from config');
      await dialog.chooseTenant(config.tenantSearchTerm, config.tenantIdSuffix);
      await dash.waitUntilLoaded();
    });

    await test.step('Sidebar navigation is visible after tenant selection', async () => {
      console.log('▶ Sidebar navigation is visible after tenant selection');
      await dash.sidebar.assertVisible();
    });

    await test.step('Navigate to the Geo Fence page via the sidebar', async () => {
      console.log('▶ Navigate to the Geo Fence page via the sidebar');
      await dash.sidebar.clickItem('Geo Fence');
      await geoFence.waitUntilLoaded();
    });

    // --- Read ---

    await test.step('Tenant selector is populated with the tenant chosen on the Dashboard', async () => {
      console.log('▶ Tenant selector is populated with the tenant chosen on the Dashboard');
      await geoFence.assertTenantPopulated(config.tenantSearchTerm);
    });

    await test.step('Site selector defaults to "All Properties"', async () => {
      console.log('▶ Site selector defaults to "All Properties"');
      await geoFence.assertSiteDefaultedToAllProperties();
    });

    await test.step('Select the first Site from the Site dropdown', async () => {
      console.log('▶ Select the first Site from the Site dropdown');
      const site = await geoFence.selectFirstSite();
      console.log(`  selected site: ${site}`);
    });

    // --- Create ---

    await test.step('Create a new Geo Fence (name, location, radius = 10) and Save', async () => {
      console.log('▶ Create a new Geo Fence (name, location, radius = 10) and Save');
      await geoFence.createGeoFence({ name: fenceName, location: searchTerm, radius: initialRadius });
    });

    await test.step('Search for the newly created Geo Fence by name', async () => {
      console.log('▶ Search for the newly created Geo Fence by name');
      await geoFence.search(fenceName);
      await geoFence.assertRowVisible(fenceName);
    });

    // --- Update ---

    await test.step('Open the Geo Fence for editing via the row Edit icon', async () => {
      console.log('▶ Open the Geo Fence for editing via the row Edit icon');
      await geoFence.openEditDialog(fenceName);
    });

    await test.step('Change the radius from 10 to 20, take a screenshot, and Save', async () => {
      console.log('▶ Change the radius from 10 to 20, take a screenshot, and Save');
      await geoFence.setRadius(updatedRadius);
      await geoFence.takeScreenshot(`geo-fence-update-${ts}.png`);
      await geoFence.clickSave();
    });

    // --- Delete ---

    await test.step('Search for the Geo Fence and delete it (confirm YES)', async () => {
      console.log('▶ Search for the Geo Fence and delete it (confirm YES)');
      await geoFence.search(fenceName);
      await geoFence.assertRowVisible(fenceName);
      await geoFence.deleteGeoFence(fenceName);
    });

    await test.step('After delete, the Geo Fence is no longer listed', async () => {
      console.log('▶ After delete, the Geo Fence is no longer listed');
      await geoFence.search(fenceName);
      await geoFence.assertRowAbsent(fenceName);
    });

    // --- Sign out ---

    await test.step('Sign out via the profile menu', async () => {
      console.log('▶ Sign out via the profile menu');
      await dash.topBar.clickSignOut();
    });

    await test.step('Confirm the Keycloak logout prompt', async () => {
      console.log('▶ Confirm the Keycloak logout prompt');
      await login.confirmLogout();
    });

    await test.step('User is redirected back to the Keycloak login page', async () => {
      console.log('▶ User is redirected back to the Keycloak login page');
      await login.assertOnLoginPage();
    });
  });

});
