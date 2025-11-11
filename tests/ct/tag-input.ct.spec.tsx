import { test, expect } from './fixtures';
import { ControlledTagInput } from './components/ControlledTagInput';

test.describe('TagInput', () => {
  test('portal renders suggestions and selection works', async ({ mount, page }) => {
    await mount(
      <ControlledTagInput
        suggestions={['React', 'Vue']}
      />,
    );

    await page.locator('input').type('R');

    await expect(page.locator('body')).toContainText('React');

    await page.locator('button:has-text("React")').click();

    await expect(page.locator('.tag-content')).toContainText('React');
  });

  test('dropdown visual regression', async ({ mount, page }) => {
    await mount(
      <ControlledTagInput
        suggestions={['React', 'Vue']}
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
      <ControlledTagInput suggestions={['Vue', 'Svelte', 'Solid']} />,
    );

    const input = page.locator('input');
    await input.type('s');

    await page.keyboard.press('ArrowDown');
    const svelteButton = page.locator('button:has-text("Svelte")');
    await expect(svelteButton).toHaveAttribute('style', /var\(--c-action\)/);

    await page.keyboard.press('ArrowDown');
    const solidButton = page.locator('button:has-text("Solid")');
    await expect(solidButton).toHaveAttribute('style', /var\(--c-action\)/);
    await page.keyboard.press('Enter');

    await expect(page.locator('.tag-content')).toContainText('Solid');
  });

  test('Backspace removes previous tag', async ({ mount, page }) => {
    await mount(
      <ControlledTagInput initialTags={['React']} />,
    );

    const input = page.locator('input');
    await input.focus();
    await input.press('Backspace');

    await expect(page.locator('.tag-content')).toHaveCount(0);
  });
});

