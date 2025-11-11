import type { Meta, StoryObj } from 'storybook/react';

import { StatsWallModal } from './StatsWallModal';
import { setMockPages } from '../mocks/storybookMocks';
import type { TaggedPage } from '../../types/gameplayTag';

function createMockPages(activityDays: Array<{ offset: number; items: number }>): TaggedPage[] {
  return activityDays.flatMap(({ offset, items }, index) =>
    Array.from({ length: items }).map((_, itemIndex) => {
      const createdAt = Date.now() - offset * 24 * 60 * 60 * 1000 - itemIndex * 1000;
      return {
        id: `page-${index}-${itemIndex}`,
        url: `https://example.com/article-${index}-${itemIndex}`,
        title: `示例页面 ${index}-${itemIndex}`,
        domain: 'example.com',
        tags: ['demo'],
        createdAt,
        updatedAt: createdAt,
        favicon: 'https://example.com/favicon.ico',
      } satisfies TaggedPage;
    })
  );
}

const lightActivity = createMockPages([
  { offset: 1, items: 1 },
  { offset: 3, items: 2 },
  { offset: 7, items: 1 },
  { offset: 15, items: 3 },
  { offset: 30, items: 2 },
]);

const heavyActivity = createMockPages(
  Array.from({ length: 60 }).map((_, index) => ({
    offset: index,
    items: (index % 3) + 1,
  }))
);

// 默认数据
setMockPages(lightActivity);

const noop = () => undefined;

const meta: Meta<typeof StatsWallModal> = {
  title: 'Popup/StatsWallModal',
  component: StatsWallModal,
  args: {
    isOpen: true,
    onClose: noop,
  },
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof StatsWallModal>;

export const Default: Story = {};

export const Empty: Story = {
  name: 'Empty Activity',
  render: (args) => {
    setMockPages([]);
    return <StatsWallModal {...args} />;
  },
};

export const Dense: Story = {
  name: 'Dense Activity',
  render: (args) => {
    setMockPages(heavyActivity);
    return <StatsWallModal {...args} />;
  },
};

