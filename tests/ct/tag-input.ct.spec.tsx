import { TagInputInteractive } from './storyWrappers/tag-input';
import { test, expect } from './fixtures';

test.describe('TagInput', () => {
  test('portal renders suggestions and selection works', async ({ mount, page }) => {
    await mount(
      <TagInputInteractive
        suggestions={['React', 'Vue']}
        tags={[]}
      />,
    );

    await page.locator('input').type('R');

    await expect(page.locator('body')).toContainText('React');

    await page.locator('button:has-text("React")').click();

    await expect(page.locator('.tag-content')).toContainText('React');
  });

  test('dropdown visual regression', async ({ mount, page }) => {
    await mount(
      <TagInputInteractive
        suggestions={['React', 'Vue']}
        tags={[]}
      />,
    );

    await page.locator('input').type('R');

    await expect(page).toHaveScreenshot('tag-input-dropdown.png', {
      animations: 'disabled',
      scale: 'css',
    });
  });

  test('supports keyboard navigation across suggestions', async ({ mount, page }) => {
    await mount(
      <TagInputInteractive
        suggestions={['Vue', 'Svelte', 'Solid']}
        tags={[]}
      />,
    );

    const input = page.locator('input');
    await input.type('s');
    await page.waitForTimeout(100);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(page.locator('.tag-content')).toContainText('Svelte');
  });

  test('Backspace removes previous tag', async ({ mount, page }) => {
    await mount(
      <TagInputInteractive
        tags={['React']}
      />,
    );

    const input = page.locator('input');
    await input.focus();
    await input.press('Backspace');

    await expect(page.locator('.tag-content')).toHaveCount(0);
  });
});

