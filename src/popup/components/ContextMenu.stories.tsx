import type { Meta, StoryObj } from '@storybook/react';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { Pencil, Trash2, Copy, Move, Link, Eye, EyeOff, Lock, ChevronRight } from 'lucide-react';

const meta: Meta<typeof ContextMenu> = {
  title: 'Popup/ContextMenu',
  component: ContextMenu,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '基于 @radix-ui/react-context-menu 实现的右键菜单组件，支持无障碍访问、键盘导航和自动位置管理。',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ContextMenu>;

const defaultMenuItems: ContextMenuItem[] = [
  {
    label: '编辑',
    onClick: () => console.log('编辑'),
    icon: <Pencil />,
  },
  {
    label: '复制',
    onClick: () => console.log('复制'),
    icon: <Copy />,
  },
  {
    label: '删除',
    onClick: () => console.log('删除'),
    icon: <Trash2 />,
    variant: 'destructive',
  },
];

export const Default: Story = {
  args: {
    menuItems: defaultMenuItems,
    children: (
      <div
        style={{
          padding: '2rem',
          background: 'var(--bg-surface-glass-subtle)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-glass-subtle)',
          cursor: 'context-menu',
        }}
      >
        右键点击这里
      </div>
    ),
  },
};

export const WithIcons: Story = {
  args: {
    menuItems: [
      {
        label: '新建',
        onClick: () => console.log('新建'),
        icon: <Pencil />,
      },
      {
        label: '编辑',
        onClick: () => console.log('编辑'),
        icon: <Pencil />,
      },
      {
        label: '复制',
        onClick: () => console.log('复制'),
        icon: <Copy />,
      },
      {
        label: '删除',
        onClick: () => console.log('删除'),
        icon: <Trash2 />,
        variant: 'destructive',
      },
    ],
    children: (
      <div
        style={{
          padding: '2rem',
          background: 'var(--bg-surface-glass-subtle)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-glass-subtle)',
          cursor: 'context-menu',
        }}
      >
        右键点击查看菜单
      </div>
    ),
  },
};

export const DestructiveAction: Story = {
  args: {
    menuItems: [
      {
        label: '编辑',
        onClick: () => console.log('编辑'),
        icon: <Pencil />,
      },
      {
        label: '删除',
        onClick: () => console.log('删除'),
        icon: <Trash2 />,
        variant: 'destructive',
      },
    ],
    children: (
      <div
        style={{
          padding: '2rem',
          background: 'var(--bg-surface-glass-subtle)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-glass-subtle)',
          cursor: 'context-menu',
        }}
      >
        右键点击查看菜单（包含危险操作）
      </div>
    ),
  },
};

export const EdgeCase: Story = {
  args: {
    menuItems: defaultMenuItems,
    children: (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '2rem',
          background: 'var(--bg-surface-glass-subtle)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-glass-subtle)',
          cursor: 'context-menu',
        }}
      >
        右键点击（测试边界检测）
        <br />
        <small style={{ color: 'var(--color-text-tertiary)' }}>
          菜单应自动调整位置，避免超出视口
        </small>
      </div>
    ),
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export const Accessibility: Story = {
  args: {
    menuItems: defaultMenuItems,
    children: (
      <div
        style={{
          padding: '2rem',
          background: 'var(--bg-surface-glass-subtle)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-glass-subtle)',
          cursor: 'context-menu',
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <strong>无障碍测试：</strong>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>✓ 支持键盘导航（方向键）</li>
          <li>✓ 支持 Enter 键选择</li>
          <li>✓ 支持 ESC 键关闭</li>
          <li>✓ 自动焦点管理</li>
          <li>✓ ARIA 属性完整</li>
        </ul>
      </div>
    ),
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'keyboard-navigation',
            enabled: true,
          },
        ],
      },
    },
  },
};

// With Shortcuts（展示快捷键）
export const WithShortcuts: Story = {
  args: {
    menuItems: [
      {
        label: 'Edit',
        onClick: () => console.log('Edit'),
        icon: <Pencil />,
        shortcut: 'Meta+E',
      },
      {
        label: 'Copy',
        onClick: () => console.log('Copy'),
        icon: <Copy />,
        shortcut: 'Meta+C',
      },
      {
        label: 'Move to…',
        onClick: () => console.log('Move to'),
        icon: <Move />,
        rightIcon: <ChevronRight />,
        shortcut: 'Meta+M',
      },
      {
        label: 'Delete',
        onClick: () => console.log('Delete'),
        icon: <Trash2 />,
        variant: 'destructive',
        shortcut: 'Meta+Backspace',
      },
    ],
    children: (
      <div
        style={{
          padding: '2rem',
          background: 'var(--bg-surface-glass-subtle)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-glass-subtle)',
          cursor: 'context-menu',
        }}
      >
        右键点击查看带快捷键的菜单
      </div>
    ),
  },
};

// With Headers & Dividers
export const WithHeadersAndDividers: Story = {
  args: {
    menuItems: [
      {
        label: 'Edit',
        onClick: () => console.log('Edit'),
        icon: <Pencil />,
      },
      {
        label: 'Move to…',
        onClick: () => console.log('Move to'),
        icon: <Move />,
        rightIcon: <ChevronRight />,
      },
      {
        type: 'divider',
        label: '',
      },
      {
        label: 'Copy link',
        onClick: () => console.log('Copy link'),
        icon: <Link />,
      },
      {
        type: 'divider',
        label: '',
      },
      {
        type: 'header',
        title: 'Change visibility',
        label: 'Change visibility',
      },
      {
        label: 'Public',
        onClick: () => console.log('Public'),
        icon: <Eye />,
        description: 'Anyone can see',
      },
      {
        label: 'Unindexed',
        onClick: () => console.log('Unindexed'),
        icon: <EyeOff />,
        description: 'People with link can see',
      },
      {
        label: 'Private',
        onClick: () => console.log('Private'),
        icon: <Lock />,
        description: 'Only collaborators can see this',
        isSelected: true,
      },
    ],
    children: (
      <div
        style={{
          padding: '2rem',
          background: 'var(--bg-surface-glass-subtle)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-glass-subtle)',
          cursor: 'context-menu',
        }}
      >
        右键点击查看带 Header 和 Divider 的菜单
      </div>
    ),
  },
};

// With Descriptions（双行文本）
export const WithDescriptions: Story = {
  args: {
    menuItems: [
      {
        label: 'Public',
        onClick: () => console.log('Public'),
        icon: <Eye />,
        description: 'Anyone can see',
      },
      {
        label: 'Unindexed',
        onClick: () => console.log('Unindexed'),
        icon: <EyeOff />,
        description: 'People with link can see',
      },
      {
        label: 'Private',
        onClick: () => console.log('Private'),
        icon: <Lock />,
        description: 'Only collaborators can see this',
        isSelected: true,
      },
    ],
    children: (
      <div
        style={{
          padding: '2rem',
          background: 'var(--bg-surface-glass-subtle)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-glass-subtle)',
          cursor: 'context-menu',
        }}
      >
        右键点击查看带描述的菜单项
      </div>
    ),
  },
};

// Selected State
export const SelectedState: Story = {
  args: {
    menuItems: [
      {
        label: 'Link',
        onClick: () => console.log('Link'),
        isSelected: true,
      },
      {
        label: 'Bookmark',
        onClick: () => console.log('Bookmark'),
      },
      {
        label: 'Embed',
        onClick: () => console.log('Embed'),
      },
    ],
    children: (
      <div
        style={{
          padding: '2rem',
          background: 'var(--bg-surface-glass-subtle)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-glass-subtle)',
          cursor: 'context-menu',
        }}
      >
        右键点击查看选中状态
      </div>
    ),
  },
};

// All Element Types
export const AllElementTypes: Story = {
  args: {
    menuItems: [
      {
        label: 'Edit',
        onClick: () => console.log('Edit'),
        icon: <Pencil />,
        shortcut: 'Meta+E',
      },
      {
        label: 'Move to…',
        onClick: () => console.log('Move to'),
        icon: <Move />,
        rightIcon: <ChevronRight />,
      },
      {
        type: 'divider',
        label: '',
      },
      {
        label: 'Copy link',
        onClick: () => console.log('Copy link'),
        icon: <Link />,
      },
      {
        type: 'divider',
        label: '',
      },
      {
        type: 'header',
        title: 'Change Format',
        label: 'Change Format',
      },
      {
        label: 'Link',
        onClick: () => console.log('Link'),
        isSelected: true,
      },
      {
        label: 'Bookmark',
        onClick: () => console.log('Bookmark'),
      },
      {
        type: 'divider',
        label: '',
      },
      {
        type: 'text',
        content: 'Created by Alexandra\nLast update on Dec 11, 2022',
        label: 'Created by Alexandra\nLast update on Dec 11, 2022',
      },
    ],
    children: (
      <div
        style={{
          padding: '2rem',
          background: 'var(--bg-surface-glass-subtle)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-glass-subtle)',
          cursor: 'context-menu',
        }}
      >
        右键点击查看所有元素类型
      </div>
    ),
  },
};

