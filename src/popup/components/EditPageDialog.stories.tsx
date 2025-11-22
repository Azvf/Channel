import type { Meta, StoryObj } from '@storybook/react';
import { EditPageDialog } from './EditPageDialog';
import type { TaggedPage } from '../../shared/types/gameplayTag';

const samplePage: TaggedPage = {
  id: 'page-1',
  url: 'https://example.com/articles/awesome-productivity',
  title: '提升效率的 10 个技巧',
  domain: 'example.com',
  tags: ['productivity', 'workflow'],
  createdAt: Date.now() - 1000 * 60 * 60 * 24,
  updatedAt: Date.now(),
  favicon: 'https://example.com/favicon.ico',
};

const defaultTags = ['React', 'TypeScript', 'Automation', 'UI/UX', 'Performance', 'Testing'];

const noop = () => undefined;

const meta: Meta<typeof EditPageDialog> = {
  title: 'Popup/EditPageDialog',
  component: EditPageDialog,
  args: {
    isOpen: true,
    page: samplePage,
    initialTagNames: ['React', 'Automation'],
    onSave: noop,
    onClose: noop,
    allSuggestions: defaultTags,
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof EditPageDialog>;

export const Default: Story = {};

export const WithManyTags: Story = {
  args: {
    initialTagNames: defaultTags,
  },
};

export const ReadonlySuggestions: Story = {
  args: {
    allSuggestions: [],
  },
};

export const ScrollLock: Story = {
  name: 'Scroll Lock Scenario',
  args: {
    ...Default.args,
  },
  render: (args: any) => (
    <>
      <div data-testid="background" style={{ height: '200vh' }} />
      <EditPageDialog {...args} />
    </>
  ),
};

