import type { Meta, StoryObj } from '@storybook/react';
import { GlassButton } from './GlassButton';

const meta: Meta<typeof GlassButton> = {
  title: 'Popup/Buttons/GlassButton',
  component: GlassButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof GlassButton>;

// Default State (默认态)
export const Default: Story = {
  args: {
    children: 'Glass Button',
    variant: 'secondary',
  },
};

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Destructive Button',
    variant: 'destructive',
  },
};

// Interactive States (交互态)
export const Hover: Story = {
  args: {
    children: 'Hover Me',
    variant: 'secondary',
  },
  parameters: {
    pseudo: {
      hover: true,
    },
  },
};

export const Active: Story = {
  args: {
    children: 'Active State',
    variant: 'secondary',
  },
  parameters: {
    pseudo: {
      active: true,
    },
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    variant: 'secondary',
    disabled: true,
  },
};

// All Variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <GlassButton variant="secondary">Secondary</GlassButton>
        <GlassButton variant="primary">Primary</GlassButton>
        <GlassButton variant="destructive">Destructive</GlassButton>
      </div>
      <div className="flex items-center gap-3">
        <GlassButton variant="secondary" disabled>
          Disabled Secondary
        </GlassButton>
        <GlassButton variant="primary" disabled>
          Disabled Primary
        </GlassButton>
        <GlassButton variant="destructive" disabled>
          Disabled Destructive
        </GlassButton>
      </div>
    </div>
  ),
};

// With Custom Padding (演示相对单位 padding)
export const CustomPadding: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <GlassButton className="px-3 py-1 text-sm">Small</GlassButton>
        <GlassButton className="px-4 py-2 text-base">Medium</GlassButton>
        <GlassButton className="px-6 py-3 text-lg">Large</GlassButton>
      </div>
    </div>
  ),
};

// Overflow Text (文本溢出测试)
export const LongText: Story = {
  render: () => (
    <div className="flex flex-col gap-3 max-w-xs">
      <GlassButton>Short</GlassButton>
      <GlassButton>This is a longer button text that might overflow</GlassButton>
      <GlassButton className="truncate max-w-full">
        This is a very long button text that should be truncated
      </GlassButton>
    </div>
  ),
};

