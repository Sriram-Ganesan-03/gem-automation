import { expect, Page } from '@playwright/test';
import { SegmentManagementLocators as Locators } from '../locators/segment-management.locators';

export class SegmentManagementPage {
  constructor(private readonly page: Page) {}

  /** Opens Segment Management from the GEM navigation. */
  async openFromGemMenu(): Promise<void> {
    const segmentMenuItem = this.page.getByText(Locators.segmentMenuItem, { exact: true });
    await expect(segmentMenuItem).toBeAttached();
    await segmentMenuItem.evaluate((element) => (element as HTMLElement).click());
    await expect(this.page).toHaveURL(/\/marketing\/gem\/segment(?:[/?#]|$)/);
    await expect(this.page.getByRole('heading', { name: Locators.listingHeading })).toBeVisible();
  }

  /** Opens the Segment creation form. */
  async clickAdd(): Promise<void> {
    await this.page.locator(Locators.addButton).click();
    await expect(this.page.getByRole('heading', { name: Locators.createHeading })).toBeVisible();
  }

  /** Fills the required segment name and description; tags are optional and left blank. */
  async fillSegmentDetails(name: string, description: string): Promise<void> {
    await this.page.getByPlaceholder(Locators.nameInput, { exact: true }).fill(name);
    await this.page.getByPlaceholder(Locators.descriptionInput, { exact: true }).fill(description);
  }

  /** Adds root and nested audience rules and selects AND/OR logic. */
  async configureAudienceCriteria(): Promise<void> {
    await expect(this.page.getByText(Locators.rootCondition)).toBeVisible();
    await this.page.getByRole('button', { name: 'AND', exact: true }).first().click();
    await this.page.getByRole('button', { name: Locators.addRuleButton }).first().click();
    await expect(this.page.getByPlaceholder('Value', { exact: true })).toHaveCount(1);
    await this.page.getByRole('button', { name: Locators.addGroupButton }).first().click();
    await expect(this.page.getByText(Locators.nestedConditionGroup)).toBeVisible();
    await this.page.getByRole('button', { name: 'OR', exact: true }).last().click();

    const selects = this.page.locator('select');
    await this.configureAgeRule(selects, 0);
    await this.configureAgeRule(selects, 5);
  }

  private async configureAgeRule(
    selects: ReturnType<Page['locator']>,
    ruleStartIndex: number,
  ): Promise<void> {
    await selects.nth(ruleStartIndex).selectOption(Locators.audienceTable);
    await selects.nth(ruleStartIndex + 2).selectOption(Locators.audienceField);
    await selects.nth(ruleStartIndex + 3).selectOption(Locators.audienceOperator);
    const values = this.page.getByPlaceholder('Value', { exact: true });
    const valueIndex = ruleStartIndex === 0 ? 0 : 1;
    await values.nth(valueIndex).fill(Locators.audienceValue);
    await expect(values.nth(valueIndex)).toHaveValue(Locators.audienceValue);
  }

  /** Calculates and verifies a displayed audience player count. */
  async calculatePlayerCount(): Promise<number> {
    await this.page.getByRole('button', { name: Locators.getPlayerCountButton }).click();
    const matchedCount = this.page.getByText(/Matched:\s*\d+\s*players/);
    await expect(matchedCount).toBeVisible({ timeout: 30000 });
    const match = (await matchedCount.innerText()).match(/\d+/);
    if (!match) {
      throw new Error('The app displayed a player-count result without a numeric count.');
    }
    return Number(match[0]);
  }

  /** Saves the configured Segment and verifies it appears in the listing. */
  async saveAndVerifyInListing(name: string): Promise<void> {
    await this.page.getByRole('button', { name: Locators.saveButton }).click();
    await expect(this.page).toHaveURL(/\/marketing\/gem\/segment(?:[/?#]|$)/, { timeout: 30000 });
    await this.page.getByPlaceholder(Locators.searchInput, { exact: true }).fill(name);
    const savedSegment = this.page.getByRole('row').filter({ hasText: name });
    await expect(savedSegment).toBeVisible({ timeout: 30000 });
    await expect(savedSegment).toContainText(name);
  }
}
