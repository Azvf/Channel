import type { Meta, StoryObj } from '@storybook/react';

import { ThemeSwitcher } from './ThemeSwitcher';

const meta: Meta<typeof ThemeSwitcher> = {
  title: 'Popup/ThemeSwitcher',
  component: ThemeSwitcher,
  args: {
    initialTheme: 'light',
  },
};

export default meta;

type Story = StoryObj<typeof ThemeSwitcher>;

export const Light: Story = {};

export const Dark: Story = {
  args: {
    initialTheme: 'dark',
  },
};

export const Dim: Story = {
  args: {
    initialTheme: 'dim',
  },
};

