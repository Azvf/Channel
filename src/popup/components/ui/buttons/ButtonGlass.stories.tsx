import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../button';

const meta: Meta<typeof Button> = {
  title: 'Popup/Buttons/Button Glass Variants',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Button>;

// Default State (默认态)
export const GlassSecondary: Story = {
  args: {
    children: 'Glass Button',
    variant: 'glass',
    size: 'fluid',
  },
};

export const GlassPrimary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'glass-primary',
    size: 'fluid',
  },
};

export const GlassDestructive: Story = {
  args: {
    children: 'Destructive Button',
    variant: 'glass-destructive',
    size: 'fluid',
  },
};

// Interactive States (交互态)
export const Hover: Story = {
  args: {
    children: 'Hover Me',
    variant: 'glass',
    size: 'fluid',
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
    variant: 'glass',
    size: 'fluid',
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
    variant: 'glass',
    size: 'fluid',
    disabled: true,
  },
};

// All Variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="glass" size="fluid">Secondary</Button>
        <Button variant="glass-primary" size="fluid">Primary</Button>
        <Button variant="glass-destructive" size="fluid">Destructive</Button>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="glass" size="fluid" disabled>
          Disabled Secondary
        </Button>
        <Button variant="glass-primary" size="fluid" disabled>
          Disabled Primary
        </Button>
        <Button variant="glass-destructive" size="fluid" disabled>
          Disabled Destructive
        </Button>
      </div>
    </div>
  ),
};

// With Custom Padding (演示相对单位 padding)
export const CustomPadding: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="glass" size="fluid" className="text-sm">Small</Button>
        <Button variant="glass" size="fluid" className="text-base">Medium</Button>
        <Button variant="glass" size="fluid" className="text-lg">Large</Button>
      </div>
    </div>
  ),
};

// Overflow Text (文本溢出测试)
export const LongText: Story = {
  render: () => (
    <div className="flex flex-col gap-3 max-w-xs">
      <Button variant="glass" size="fluid">Short</Button>
      <Button variant="glass" size="fluid">This is a longer button text that might overflow</Button>
      <Button variant="glass" size="fluid" className="truncate max-w-full">
        This is a very long button text that should be truncated
      </Button>
    </div>
  ),
};
