import { expect, test } from '@playwright/test';

test('saved qualifier has the requested details and rule', async ({ page }) => {
  const username = process.env.APP_USERNAME;
  const password = process.env.APP_PASSWORD;
  expect(username, 'APP_USERNAME must be set').toBeTruthy();
  expect(password, 'APP_PASSWORD must be set').toBeTruthy();

  await page.goto('/auth/login');
  await page.getByRole('button', { name: /Use Direct Login/ }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill(username!);
  await page.getByRole('textbox', { name: 'Password' }).fill(password!);
  await page.getByRole('button', { name: 'Sign In' }).click();

  const sessionDialog = page.getByRole('alertdialog', { name: 'Confirmation' });
  const loginOutcome = await Promise.race([
    page.waitForURL(/\/dashboard$/, { timeout: 20000 }).then(() => 'dashboard'),
    sessionDialog.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'confirmation'),
  ]);
  if (loginOutcome === 'confirmation') {
    await sessionDialog.getByRole('button', { name: 'Yes' }).click();
    await expect(sessionDialog).toBeHidden({ timeout: 20000 });
  } else if (await sessionDialog.isVisible().catch(() => false)) {
    await sessionDialog.getByRole('button', { name: 'Yes' }).click();
    await expect(sessionDialog).toBeHidden({ timeout: 20000 });
  }
  await expect(page).toHaveURL(/\/dashboard$/);

  const qualifiersLink = page.locator('a[href="/marketing/gem/qualifier"]');
  await expect(qualifiersLink).toBeAttached();
  await qualifiersLink.evaluate((element: HTMLAnchorElement) => element.click());
  await expect(page).toHaveURL(/\/marketing\/gem\/qualifier$/);

  const qualifierRow = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'this is for testing', exact: true }) })
    .first();
  await expect(qualifierRow).toBeVisible();
  await expect(qualifierRow).toContainText('this if for testing');
  await expect(qualifierRow).toContainText('this is for testing');
  await qualifierRow.getByRole('button').click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit Qualifier' })).toBeVisible();
  await expect(page.getByPlaceholder('e.g. VIP Status, Deposit Over $100')).toHaveValue(
    'this is for testing',
  );
  await expect(
    page.getByRole('option', { name: 'this is for testing', selected: true }),
  ).toBeVisible();
  await expect(
    page.getByPlaceholder('Describe what rule criteria this qualifier evaluates...'),
  ).toHaveValue('this if for testing');
  await expect(page.getByText('Root Condition (All conditions must match)')).toBeVisible();

  const rule = page.locator('select');
  await expect(rule.nth(0)).toHaveValue('SlotTxn-Points-Group');
  await expect(rule.nth(2)).toHaveValue('transaction_type');
  await expect(rule.nth(3)).toHaveValue('equalTo');
  await expect(page.getByRole('textbox', { name: 'Value' })).toHaveValue('testing');
});
