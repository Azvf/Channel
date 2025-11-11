import { useState } from 'react';
import type { Meta, StoryObj } from 'storybook/react';

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

const noop = () => undefined;

const meta: Meta<typeof TagInput> = {
  title: 'Popup/TagInput',
  component: TagInput,
  args: {
    tags: [],
    suggestions,
    placeholder: '添加标签…',
    onTagsChange: noop,
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
    onCreateTag: noop,
  },
};

export const Interactive: Story = {
  args: {
    suggestions,
    tags: [],
  },
  render: (args) => {
    const [tags, setTags] = useState<string[]>(args.tags ?? []);
    return <TagInput {...args} tags={tags} onTagsChange={setTags} />;
  },
};

