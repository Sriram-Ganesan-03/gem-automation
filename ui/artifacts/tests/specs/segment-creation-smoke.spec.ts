import { expect, test } from '@playwright/test';
import { SegmentLoginPage } from '../pages/segment-login.page';
import { SegmentManagementPage } from '../pages/segment-management.page';

test('creates a Segment with audience conditions and verifies it in the listing', async ({ page }) => {
  test.setTimeout(120000);
  const loginPage = new SegmentLoginPage(page);
  const segmentPage = new SegmentManagementPage(page);
  const segmentName = 'this is for testing';
  const description = 'this is for testing';

  await test.step('Open the direct login page', async () => {
    await loginPage.open();
  });

  await test.step('Sign in and handle the existing-session confirmation', async () => {
    await loginPage.signIn();
    await loginPage.approveExistingSessionLogoutIfRequested();
    await loginPage.expectDashboardDisplayed();
  });

  await test.step('Navigate to GEM Segment Management', async () => {
    await segmentPage.openFromGemMenu();
  });

  await test.step('Open the new Segment form and enter its details', async () => {
    await segmentPage.clickAdd();
    await segmentPage.fillSegmentDetails(segmentName, description);
  });

  await test.step('Configure root and nested audience criteria', async () => {
    await segmentPage.configureAudienceCriteria();
  });

  await test.step('Calculate and verify the player count', async () => {
    const playerCount = await segmentPage.calculatePlayerCount();
    expect(playerCount).toBeGreaterThan(0);
  });

  await test.step('Save the Segment and verify it in the listing', async () => {
    await segmentPage.saveAndVerifyInListing(segmentName);
  });
});
