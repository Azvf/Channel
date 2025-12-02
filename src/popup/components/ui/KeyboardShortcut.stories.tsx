import type { Meta, StoryObj } from '@storybook/react';
import { KeyboardShortcut } from './KeyboardShortcut';

const meta: Meta<typeof KeyboardShortcut> = {
  title: 'Popup/UI/KeyboardShortcut',
  component: KeyboardShortcut,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof KeyboardShortcut>;

// Default State
export const Default: Story = {
  args: {
    shortcut: 'Meta+K',
  },
};

// Mac Style (⌘K)
export const MacStyle: Story = {
  args: {
    shortcut: 'Meta+K',
  },
  parameters: {
    docs: {
      description: {
        story: '在 Mac 平台上显示为 ⌘K',
      },
    },
  },
};

// Windows Style (Ctrl+K)
export const WindowsStyle: Story = {
  args: {
    shortcut: 'Ctrl+K',
  },
  parameters: {
    docs: {
      description: {
        story: '在 Windows 平台上显示为 Ctrl+K',
      },
    },
  },
};

// Multiple Modifiers
export const MultipleModifiers: Story = {
  args: {
    shortcut: 'Meta+Shift+K',
  },
  parameters: {
    docs: {
      description: {
        story: '支持多个修饰键组合',
      },
    },
  },
};

// All Modifiers
export const AllModifiers: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <KeyboardShortcut shortcut="Meta+K" />
      <KeyboardShortcut shortcut="Ctrl+K" />
      <KeyboardShortcut shortcut="Alt+K" />
      <KeyboardShortcut shortcut="Shift+K" />
      <KeyboardShortcut shortcut="Meta+Shift+K" />
      <KeyboardShortcut shortcut="Ctrl+Alt+K" />
      <KeyboardShortcut shortcut="Meta+Alt+Shift+K" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示所有修饰键组合',
      },
    },
  },
};

// Single Key
export const SingleKey: Story = {
  args: {
    shortcut: 'K',
  },
  parameters: {
    docs: {
      description: {
        story: '单个按键（无修饰键）',
      },
    },
  },
};

// In Context (Menu Item)
export const InMenuItem: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '200px',
        padding: 'var(--space-2) var(--space-4)',
        gap: 'var(--space-2)',
      }}
    >
      <span style={{ font: 'var(--font-list-item)', color: 'var(--color-text-primary)' }}>
        Edit
      </span>
      <KeyboardShortcut shortcut="Meta+E" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '在菜单项中的使用示例',
      },
    },
  },
};


