import { test, expect } from './fixtures';
import { StatsWallModal } from '../../src/popup/components/StatsWallModal';
import type { TaggedPage } from '../../src/types/gameplayTag';
import { setMockPages } from '../../src/popup/mocks/storybookMocks';

const createDensePages = (): TaggedPage[] => {
  const today = Date.now();
  return Array.from({ length: 8 }).map((_, index) => {
    const createdAt = today - index * 1000 * 60;
    return {
      id: `stats-page-${index}`,
      url: `https://example.com/stats-${index}`,
      title: `统计页面 ${index}`,
      domain: 'example.com',
      tags: ['tag-react'],
      createdAt,
      updatedAt: createdAt,
      favicon: 'https://example.com/favicon.ico',
    };
  });
};

test.describe('StatsWallModal', () => {
  test.beforeEach(async () => {
    setMockPages(createDensePages());
  });

  test('shows activity tooltip on hover', async ({ mount, page }) => {
    await mount(
      <StatsWallModal isOpen onClose={() => {}} />,
    );

    const hotSquare = page.locator('.activity-day-square[data-level="3"]').first();
    await hotSquare.waitFor();
    await hotSquare.hover();

    await expect(page.locator('body')).toContainText('items on');
  });

  test('heat map visual regression', async ({ mount, page }) => {
    await mount(
      <StatsWallModal isOpen onClose={() => {}} />,
    );

    const container = page.locator('.stats-wall-container');
    await container.waitFor();

    await expect(container).toHaveScreenshot('stats-wall-heatmap.png', {
      animations: 'disabled',
      scale: 'css',
    });
  });
});

