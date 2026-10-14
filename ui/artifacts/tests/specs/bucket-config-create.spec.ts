import { test } from '@playwright/test';
import { BucketConfigPage } from '../pages/bucket-config.page';

const bucketConfig = {
  name: 'this is for testing',
  code: '012345',
  type: 'Points',
  status: 'Active',
} as const;

test.describe('Chickasaw Portal Bucket Config create flow', () => {
  test('creates and verifies a bucket configuration', async ({ page }) => {
    const bucketConfigPage = new BucketConfigPage(page);

    await test.step('Open the application login page', async () => {
      await bucketConfigPage.goto();
      await page.addStyleTag({
        content:
          'input[type="email"], input[autocomplete="username"], input[name="username"] { -webkit-text-security: disc !important; color: transparent !important; caret-color: transparent !important; }',
      });
    });

    await test.step('Sign in with runtime credentials', async () => {
      await bucketConfigPage.signIn();
      await bucketConfigPage.handleLoginOutcome();
    });

    await test.step('Navigate to Bucket Config', async () => {
      await bucketConfigPage.openBucketConfig();
    });

    let configurationAlreadyExists = false;
    await test.step('Check for an existing matching configuration', async () => {
      configurationAlreadyExists = await bucketConfigPage.configurationExists(bucketConfig.name);
    });

    if (!configurationAlreadyExists) {
      await test.step('Open the new bucket configuration form', async () => {
        await bucketConfigPage.openCreateForm();
      });

      await test.step('Enter the bucket configuration details', async () => {
        await bucketConfigPage.fillBucketName(bucketConfig.name);
        await bucketConfigPage.fillBucketCode(bucketConfig.code);
        await bucketConfigPage.selectBucketType(bucketConfig.type);
        await bucketConfigPage.selectStatus(bucketConfig.status);
        await bucketConfigPage.assertMandatoryFieldsAreFilled();
        await bucketConfigPage.assertFormValues(bucketConfig.name, bucketConfig.code);
      });

      await test.step('Save the bucket configuration', async () => {
        await bucketConfigPage.saveConfiguration();
      });
    }

    await test.step('Verify the saved configuration in the listing', async () => {
      await bucketConfigPage.assertConfigurationInListing(
        bucketConfig.name,
        bucketConfig.code,
        bucketConfig.type,
        bucketConfig.status,
      );
    });
  });
});
