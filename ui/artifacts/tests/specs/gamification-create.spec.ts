import { expect, test } from '@playwright/test';
import { GamificationPage } from '../pages/gamification.page';

test('create a gamification game with two prizes', async ({ page }) => {
  const username = process.env.APP_USERNAME;
  const password = process.env.APP_PASSWORD;
  expect(username, 'APP_USERNAME must be set').toBeTruthy();
  expect(password, 'APP_PASSWORD must be set').toBeTruthy();

  const gameName = 'this is for testing';
  const prizeLabel = 'this is for testing';
  const prizeImageUrl = 'https://placehold.co/300x200.png';
  const gamificationPage = new GamificationPage(page);

  await test.step('Sign in and reach the dashboard', async () => {
    await gamificationPage.login(username!, password!);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  await test.step('Open GEM Gamification and start a new game', async () => {
    await gamificationPage.openGamification();
    await gamificationPage.openCreateGame();
    await expect(
      page.getByRole('heading', { name: 'Prize Configuration' }),
    ).toBeVisible();
    await gamificationPage.assertPrizeCount(1);
  });

  await test.step('Configure and validate two prizes', async () => {
    await gamificationPage.fillGameName(gameName);
    await gamificationPage.setPrize(0, prizeLabel, prizeImageUrl);
    await gamificationPage.setPrize(1, prizeLabel, prizeImageUrl);
    await gamificationPage.assertPrizeCount(2);
    await gamificationPage.assertPrizeDetails(prizeLabel, prizeImageUrl, 0);
    await gamificationPage.assertPrizeDetails(prizeLabel, prizeImageUrl, 1);
  });

  await test.step('Verify prize removal and count update', async () => {
    await gamificationPage.assertPrizeRemoveControls(2);
    await gamificationPage.addEmptyPrize();
    await gamificationPage.assertPrizeCount(3);
    await gamificationPage.removePrize(2);
    await gamificationPage.assertPrizeCount(2);
    await gamificationPage.assertPrizeRemoveControls(2);
  });

  await test.step('Save and verify the game in the listing', async () => {
    await gamificationPage.saveConfiguration();
    await expect(page).toHaveURL(/\/marketing\/gem\/gamification$/);
    const savedGameRow = await gamificationPage.findSavedGame(gameName);
    expect(savedGameRow).toContain(gameName);
  });
});
