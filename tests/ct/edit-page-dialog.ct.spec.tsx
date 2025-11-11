import { test, expect } from './fixtures';
import { EditPageDialog } from '../../src/popup/components/EditPageDialog';
import type { TaggedPage } from '../../src/types/gameplayTag';

const samplePage: TaggedPage = {
  id: 'sample',
  url: 'https://example.com/sample-article',
  title: '测试页面标题',
  domain: 'example.com',
  tags: ['tag-react'],
  createdAt: Date.now() - 1000 * 60 * 60,
  updatedAt: Date.now(),
  favicon: 'https://example.com/favicon.ico',
  description: '用于 L3 组件测试的示例页面',
};

test.describe('EditPageDialog', () => {
  test('locks window scroll while dialog is open', async ({ mount, page }) => {
    await mount(
      <>
        <div data-testid="background" style={{ height: '200vh' }} />
        <EditPageDialog
          isOpen
          onClose={() => {}}
          page={samplePage}
          initialTagNames={['React']}
          onSave={() => {}}
          allSuggestions={['React', 'TypeScript', 'UI/UX']}
        />
      </>,
    );

    await page.mouse.wheel(0, 1000);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);

    const scrollable = page.locator('[data-testid="edit-dialog-scrollable"]');
    await scrollable.evaluate((element) => {
      element.scrollTop = 120;
    });
    const scrollTop = await scrollable.evaluate((element) => element.scrollTop);
    expect(scrollTop).toBeGreaterThan(0);
  });
});

