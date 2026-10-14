import { test } from '@playwright/test';
import { bucketConfigRuntime } from '../config/bucket-config-runtime';
import { RewardConfigPage } from '../pages/reward-config.page';

const rewardConfig = {
  category: 'Deposit Match Bonus',
  name: 'this is for testing',
  unit: 'Points',
  bucketPool: 'this is for testing (012345)',
  status: 'Active',
} as const;

test.describe('Chickasaw Portal Reward Config create flow', () => {
  test('creates and verifies a reward configuration', async ({ page }) => {
    const rewardConfigPage = new RewardConfigPage(page);
    const appOrigin = new URL(bucketConfigRuntime.launchUrl).origin;

    await page.route(
      (url) => {
        const requestUrl = new URL(url);
        return (
          requestUrl.origin === appOrigin &&
          requestUrl.pathname === '/gem/v2/v2/rewardType/units'
        );
      },
      async (route) => {
        const requestUrl = new URL(route.request().url());
        requestUrl.pathname = requestUrl.pathname.replace('/gem/v2/v2/', '/gem/v2/');
        await route.continue({ url: requestUrl.toString() });
      },
    );
    test.info().annotations.push({
      type: 'app-workaround',
      description: 'Rewrite the duplicated /v2/ segment in the reward-units API request.',
    });

    await test.step('Open the application login page', async () => {
      await rewardConfigPage.goto();
      await page.addStyleTag({
        content:
          'input[type="email"], input[autocomplete="username"], input[name="username"] { -webkit-text-security: disc !important; color: transparent !important; caret-color: transparent !important; }',
      });
    });

    await test.step('Sign in with runtime credentials', async () => {
      await rewardConfigPage.signIn();
      await rewardConfigPage.handleLoginOutcome();
    });

    await test.step('Navigate to Reward Config', async () => {
      await rewardConfigPage.openRewardConfig();
    });

    await test.step('Open the new reward configuration form', async () => {
      await rewardConfigPage.openCreateForm();
    });

    await test.step('Enter and verify the reward configuration details', async () => {
      await rewardConfigPage.selectRewardCategory(rewardConfig.category);
      await rewardConfigPage.fillRewardName(rewardConfig.name);
      await rewardConfigPage.selectRewardUnit(rewardConfig.unit);
      await rewardConfigPage.selectTargetBucketPool(rewardConfig.bucketPool);
      await rewardConfigPage.selectStatus(rewardConfig.status);
      await rewardConfigPage.assertMandatoryFieldsAreFilled();
      await rewardConfigPage.assertFormValues(
        rewardConfig.category,
        rewardConfig.name,
        rewardConfig.unit,
        rewardConfig.bucketPool,
        rewardConfig.status,
      );
    });

    await test.step('Save the reward configuration', async () => {
      await rewardConfigPage.saveConfiguration();
    });

    await test.step('Verify the configuration in the listing', async () => {
      await rewardConfigPage.assertConfigurationInListing(
        rewardConfig.category,
        rewardConfig.name,
        rewardConfig.unit,
        rewardConfig.bucketPool,
        rewardConfig.status,
      );
    });
  });
});
