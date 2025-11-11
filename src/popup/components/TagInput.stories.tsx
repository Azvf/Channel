import type { Meta, StoryObj } from 'storybook/react';
import { fn } from '@storybook/test';

import { TagInput } from './TagInput';

const suggestions = [
  'React',
  'Vue',
  'Svelte',
  'Angular',
  'Astro',
  'Solid',
  'Qwik',
  'Next.js',
  'Remix',
  'Nuxt',
];

const meta: Meta<typeof TagInput> = {
  title: 'Popup/TagInput',
  component: TagInput,
  args: {
    tags: [],
    suggestions,
    placeholder: '添加标签…',
    onTagsChange: fn(),
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof TagInput>;

export const Default: Story = {
  args: {
    suggestions: [],
  },
};

export const WithSuggestions: Story = {};

export const WithInitialTags: Story = {
  args: {
    tags: ['React', 'TypeScript'],
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const CreateMode: Story = {
  args: {
    mode: 'create',
    allowCreation: true,
    onCreateTag: fn(),
  },
};

