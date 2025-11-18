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

// 大量活动数据（用于测试滚动和性能）
const veryHeavyActivity = createMockPages(
  Array.from({ length: 365 }).map((_, index) => ({
    offset: index,
    items: Math.floor(Math.random() * 5) + 1,
  }))
);

// 单日活动（用于测试单个活动的情况）
const singleDayActivity = createMockPages([
  { offset: 1, items: 10 },
]);

// 远古活动（用于测试自动滚动到最早活动）
const oldActivity = createMockPages([
  { offset: 300, items: 5 }, // 300天前
  { offset: 200, items: 3 },
  { offset: 100, items: 2 },
  { offset: 1, items: 1 },
]);

// 边界活动（在很晚的位置）
const recentOnlyActivity = createMockPages([
  { offset: 0, items: 8 },
  { offset: 1, items: 5 },
  { offset: 2, items: 3 },
]);

// 稀疏活动（用于测试低活动度场景）
const sparseActivity = createMockPages([
  { offset: 100, items: 1 },
  { offset: 150, items: 1 },
  { offset: 200, items: 1 },
]);

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

export const VeryHeavy: Story = {
  name: 'Very Heavy Activity (1 Year)',
  render: (args) => {
    setMockPages(veryHeavyActivity);
    return <StatsWallModal {...args} />;
  },
};

export const SingleDay: Story = {
  name: 'Single Day Activity',
  render: (args) => {
    setMockPages(singleDayActivity);
    return <StatsWallModal {...args} />;
  },
};

export const OldActivity: Story = {
  name: 'Old Activity (First Activity Far Back)',
  render: (args) => {
    setMockPages(oldActivity);
    return <StatsWallModal {...args} />;
  },
};

export const RecentOnly: Story = {
  name: 'Recent Only Activity',
  render: (args) => {
    setMockPages(recentOnlyActivity);
    return <StatsWallModal {...args} />;
  },
};

export const Sparse: Story = {
  name: 'Sparse Activity',
  render: (args) => {
    setMockPages(sparseActivity);
    return <StatsWallModal {...args} />;
  },
};

export const Closed: Story = {
  name: 'Closed Modal',
  args: {
    isOpen: false,
  },
};

