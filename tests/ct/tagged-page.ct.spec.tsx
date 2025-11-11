import { TaggedPageDefaultStory } from './storyWrappers/tagged-page';
import { test, expect } from './fixtures';

test.describe('TaggedPage', () => {
  test('shows context menu via actions button', async ({ mount, page }) => {
    await mount(<TaggedPageDefaultStory />);

    const firstCard = page.locator('[data-testid^="page-card-"]').first();
    await firstCard.waitFor();
    await firstCard.locator('button[aria-label="更多操作"]').click();

    const menu = page.locator('[data-menu-id]');
    await expect(menu).toBeVisible({ timeout: 2000 });
    await expect(menu).toContainText('Edit');
    await expect(menu).toContainText('Copy URL');
  });

  test('opens menu on long press (touch)', async ({ mount, page }) => {
    await mount(<TaggedPageDefaultStory />);

    const card = page.locator('[data-testid^="page-card-"]').nth(1);
    await card.waitFor();

    await card.dispatchEvent('mousedown', { button: 0 });
    await page.waitForTimeout(600);
    await card.dispatchEvent('mouseup', { button: 0 });

    const menu = page.locator('[data-menu-id]');
    await expect(menu).toBeVisible({ timeout: 4000 });
    await expect(menu).toContainText('Edit');
  });
});

