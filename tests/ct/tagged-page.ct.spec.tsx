import { test, expect } from './fixtures';
import { TaggedPage } from '../../src/popup/components/TaggedPage';
import { setMockPages } from '../../src/popup/mocks/storybookMocks';
import type { TaggedPage as TaggedPageType } from '../../src/types/gameplayTag';

const mockPages: TaggedPageType[] = [
  {
    id: 'page-alpha',
    url: 'https://example.com/alpha',
    title: 'Alpha 页面',
    domain: 'example.com',
    tags: ['tag-react', 'tag-ui'],
    createdAt: Date.now() - 1000 * 60 * 60,
    updatedAt: Date.now() - 1000 * 60,
    description: '用于测试上下文菜单的页面',
    favicon: 'https://example.com/favicon.ico',
  },
  {
    id: 'page-beta',
    url: 'https://example.com/beta',
    title: 'Beta 页面',
    domain: 'example.com',
    tags: ['tag-type'],
    createdAt: Date.now() - 1000 * 60 * 120,
    updatedAt: Date.now() - 1000 * 60 * 30,
    description: '用于测试长按菜单的页面',
    favicon: 'https://example.com/favicon.ico',
  },
];

test.describe('TaggedPage', () => {
  test.beforeEach(async () => {
    setMockPages(mockPages);
  });

  test('shows context menu on right click', async ({ mount, page }) => {
    await mount(
      <TaggedPage onOpenSettings={() => {}} onOpenStats={() => {}} />,
    );

    const firstCard = page.getByTestId('page-card-page-alpha');
    await firstCard.waitFor();
    await firstCard.click({ button: 'right' });

    await expect(page.locator('body')).toContainText('Edit');
    await expect(page.locator('body')).toContainText('Copy URL');
  });

  test('opens menu on long press (touch)', async ({ mount, page }) => {
    await mount(
      <TaggedPage onOpenSettings={() => {}} onOpenStats={() => {}} />,
    );

    const card = page.getByTestId('page-card-page-beta');
    await card.waitFor();

    const box = await card.boundingBox();
    if (!box) {
      throw new Error('Failed to get card bounding box');
    }

    await card.dispatchEvent('touchstart', {
      touches: [
        {
          clientX: box.x + box.width / 2,
          clientY: box.y + box.height / 2,
        },
      ],
    });

    await page.waitForTimeout(600);

    await card.dispatchEvent('touchend', {
      changedTouches: [
        {
          clientX: box.x + box.width / 2,
          clientY: box.y + box.height / 2,
        },
      ],
    });

    await expect(page.locator('body')).toContainText('Edit');
  });
});

