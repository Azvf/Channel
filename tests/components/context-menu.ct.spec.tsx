import { test, expect } from './fixtures';
import { ContextMenu, ContextMenuItem } from '../../src/popup/components/ContextMenu';
import { Pencil, Copy, Move, ChevronRight, Eye, Lock } from 'lucide-react';

test.describe('ContextMenu', () => {
  test('basic menu renders correctly', async ({ mount, page }) => {
    const menuItems: ContextMenuItem[] = [
      {
        label: 'Edit',
        onClick: () => {},
        icon: <Pencil />,
      },
      {
        label: 'Copy',
        onClick: () => {},
        icon: <Copy />,
      },
    ];

    await mount(
      <ContextMenu menuItems={menuItems}>
        <div
          style={{
            padding: '2rem',
            background: 'var(--bg-surface-glass-subtle)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass-subtle)',
            cursor: 'context-menu',
          }}
        >
          Right click here
        </div>
      </ContextMenu>
    );

    // 右键点击触发菜单
    await page.locator('div:has-text("Right click here")').click({ button: 'right' });

    // 等待菜单出现
    const menu = page.locator('[role="menuitem"]');
    await expect(menu.first()).toBeVisible({ timeout: 1000 });

    // 验证菜单项文本
    await expect(page.locator('text=Edit')).toBeVisible();
    await expect(page.locator('text=Copy')).toBeVisible();
  });

  test('menu with shortcuts visual regression', async ({ mount, page }) => {
    const menuItems: ContextMenuItem[] = [
      {
        label: 'Edit',
        onClick: () => {},
        icon: <Pencil />,
        shortcut: 'Meta+E',
      },
      {
        label: 'Copy',
        onClick: () => {},
        icon: <Copy />,
        shortcut: 'Meta+C',
      },
      {
        label: 'Move to…',
        onClick: () => {},
        icon: <Move />,
        rightIcon: <ChevronRight />,
        shortcut: 'Meta+M',
      },
    ];

    await mount(
      <ContextMenu menuItems={menuItems}>
        <div
          style={{
            padding: '2rem',
            background: 'var(--bg-surface-glass-subtle)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass-subtle)',
            cursor: 'context-menu',
          }}
        >
          Right click here
        </div>
      </ContextMenu>
    );

    // 右键点击触发菜单
    await page.locator('div:has-text("Right click here")').click({ button: 'right' });

    // 等待菜单出现并稳定
    const menu = page.locator('[role="menuitem"]');
    await expect(menu.first()).toBeVisible({ timeout: 1000 });
    await page.waitForTimeout(250); // 等待动画完成

    // 视觉回归测试
    await expect(page).toHaveScreenshot('context-menu-with-shortcuts.png', {
      animations: 'disabled',
      scale: 'css',
      maxDiffPixels: 500,
    });
  });

  test('selected state visual regression', async ({ mount, page }) => {
    const menuItems: ContextMenuItem[] = [
      {
        label: 'Public',
        onClick: () => {},
        icon: <Eye />,
        description: 'Anyone can see',
      },
      {
        label: 'Private',
        onClick: () => {},
        icon: <Lock />,
        description: 'Only collaborators can see this',
        isSelected: true,
      },
    ];

    await mount(
      <ContextMenu menuItems={menuItems}>
        <div
          style={{
            padding: '2rem',
            background: 'var(--bg-surface-glass-subtle)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass-subtle)',
            cursor: 'context-menu',
          }}
        >
          Right click here
        </div>
      </ContextMenu>
    );

    // 右键点击触发菜单
    await page.locator('div:has-text("Right click here")').click({ button: 'right' });

    // 等待菜单出现并稳定
    const menu = page.locator('[role="menuitem"]');
    await expect(menu.first()).toBeVisible({ timeout: 1000 });
    await page.waitForTimeout(250); // 等待动画完成

    // 视觉回归测试
    await expect(page).toHaveScreenshot('context-menu-selected-state.png', {
      animations: 'disabled',
      scale: 'css',
      maxDiffPixels: 500,
    });
  });

  test('all element types visual regression', async ({ mount, page }) => {
    const menuItems: ContextMenuItem[] = [
      {
        label: 'Edit',
        onClick: () => {},
        icon: <Pencil />,
        shortcut: 'Meta+E',
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
        onClick: () => {},
        isSelected: true,
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
    ];

    await mount(
      <ContextMenu menuItems={menuItems}>
        <div
          style={{
            padding: '2rem',
            background: 'var(--bg-surface-glass-subtle)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass-subtle)',
            cursor: 'context-menu',
          }}
        >
          Right click here
        </div>
      </ContextMenu>
    );

    // 右键点击触发菜单
    await page.locator('div:has-text("Right click here")').click({ button: 'right' });

    // 等待菜单出现并稳定
    const menu = page.locator('[role="menuitem"]');
    await expect(menu.first()).toBeVisible({ timeout: 1000 });
    await page.waitForTimeout(250); // 等待动画完成

    // 视觉回归测试
    await expect(page).toHaveScreenshot('context-menu-all-elements.png', {
      animations: 'disabled',
      scale: 'css',
      maxDiffPixels: 500,
    });
  });
});

