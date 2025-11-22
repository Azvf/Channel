import { ScrollLockStory } from './storyWrappers/edit-page-dialog';
import { test, expect } from './fixtures';

test.describe('EditPageDialog', () => {
  test('locks window scroll while dialog is open', async ({ mount, page }) => {
    await mount(<ScrollLockStory />);
    await page.waitForTimeout(100);

    await page.mouse.wheel(0, 1000);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);

    const scrollInfo = await page.evaluate(() => {
      const scrollable = document.querySelector('[data-testid="edit-dialog-scrollable"]') as HTMLElement | null;
      if (!scrollable) {
        throw new Error('Scrollable section not found');
      }
      const styles = window.getComputedStyle(scrollable);
      return {
        bodyOverflow: window.getComputedStyle(document.body).overflow,
        scrollOverflowY: styles.overflowY,
        scrollHeight: scrollable.scrollHeight,
        clientHeight: scrollable.clientHeight,
      };
    });

    expect(scrollInfo.bodyOverflow).toBe('hidden');
    expect(scrollInfo.scrollOverflowY === 'auto' || scrollInfo.scrollOverflowY === 'scroll').toBe(true);
  });
});

