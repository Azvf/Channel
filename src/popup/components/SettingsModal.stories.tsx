import type { Meta, StoryObj } from '@storybook/react';
import { SettingsModal } from './SettingsModal';

const noop = () => undefined;

const meta: Meta<typeof SettingsModal> = {
  title: 'Popup/SettingsModal',
  component: SettingsModal,
  args: {
    isOpen: true,
    onClose: noop,
    initialTheme: 'light',
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof SettingsModal>;

export const Default: Story = {};

export const DarkTheme: Story = {
  args: {
    initialTheme: 'dark',
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};

