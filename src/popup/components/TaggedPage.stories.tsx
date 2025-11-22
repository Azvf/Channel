import type { Meta, StoryObj } from '@storybook/react';

import { TaggedPage as TaggedPageComponent } from './TaggedPage';
import { setMockPages } from '../mocks/storybookMocks';
import type { TaggedPage } from '../../shared/types/gameplayTag';

const basePages: TaggedPage[] = [
  {
    id: 'page-one',
    url: 'https://example.com/edge-extension-design',
    title: 'Edge 扩展设计指南',
    domain: 'example.com',
    tags: ['tag-react', 'tag-ui'],
    createdAt: Date.now() - 1000 * 60 * 60,
    updatedAt: Date.now() - 1000 * 60 * 15,
    description: '如何设计具有沉浸式视觉效果的浏览器扩展界面',
    favicon: 'https://example.com/favicon.ico',
  },
  {
    id: 'page-two',
    url: 'https://engineering.blog/tags-architecture',
    title: '标签系统架构深度解析',
    domain: 'engineering.blog',
    tags: ['tag-type'],
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    updatedAt: Date.now() - 1000 * 60 * 60,
    description: '构建可扩展的标签关系与同步模型',
    favicon: 'https://engineering.blog/favicon.ico',
  },
  {
    id: 'page-three',
    url: 'https://design.dev/glassmorphism-best-practices',
    title: '毛玻璃设计最佳实践',
    domain: 'design.dev',
    tags: ['tag-ui'],
    createdAt: Date.now() - 1000 * 60 * 60 * 36,
    updatedAt: Date.now() - 1000 * 60 * 60 * 5,
    description: '平衡毛玻璃视觉与可读性的策略',
    favicon: 'https://design.dev/favicon.ico',
  },
];

const noop = () => undefined;

const meta: Meta<typeof TaggedPageComponent> = {
  title: 'Popup/TaggedPage',
  component: TaggedPageComponent,
  args: {
    onOpenSettings: noop,
    onOpenStats: noop,
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof TaggedPageComponent>;

export const Default: Story = {
  render: (args: any) => {
    setMockPages(basePages);
    return <TaggedPageComponent {...args} />;
  },
};

export const WithManyPages: Story = {
  render: (args: any) => {
    const extendedPages: TaggedPage[] = [
      ...basePages,
      ...Array.from({ length: 6 }).map((_, index) => ({
        id: `page-extra-${index}`,
        url: `https://knowledge.base/article-${index}`,
        title: `知识库文章 ${index + 1}`,
        domain: 'knowledge.base',
        tags: index % 2 === 0 ? ['tag-react'] : ['tag-type', 'tag-ui'],
        createdAt: Date.now() - (index + 4) * 1000 * 60 * 60,
        updatedAt: Date.now() - (index + 2) * 1000 * 60 * 30,
        description: '用于模拟长列表与滚动交互的案例',
        favicon: 'https://knowledge.base/favicon.ico',
      })),
    ];
    setMockPages(extendedPages);
    return <TaggedPageComponent {...args} />;
  },
};

export const EmptyState: Story = {
  render: (args: any) => {
    setMockPages([]);
    return <TaggedPageComponent {...args} />;
  },
};

