import { StatsDefaultStory, StatsDenseStory } from './storyWrappers/stats-wall-modal';
import { test, expect } from './fixtures';

test.describe('StatsWallModal', () => {
  test('shows activity tooltip on hover', async ({ mount, page }) => {
    await mount(<StatsDenseStory />);

    const hotSquare = page.locator('.activity-day-square[data-level="3"]').first();
    await hotSquare.waitFor();
    await expect(hotSquare).toHaveAttribute('title', /items on/i);
  });

  test('heat map visual regression', async ({ mount, page }) => {
    await mount(<StatsDefaultStory />);

    const container = page.locator('.stats-wall-container');
    await container.waitFor();

    await expect(container).toHaveScreenshot('stats-wall-heatmap.png', {
      animations: 'disabled',
      scale: 'css',
    });
  });
});

