import React, { ReactNode } from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { motion } from 'framer-motion';
import { SMOOTH_TRANSITION } from '../utils/motion'; // [Refactor] 使用统一的动画系统

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: 'default' | 'destructive';
}

interface ContextMenuProps {
  children: ReactNode;
  menuItems: ContextMenuItem[];
  className?: string;
}

export function ContextMenu({ children, menuItems, className }: ContextMenuProps) {
  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild className={className}>
        {children}
      </ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
          asChild
          // [Refactor] 使用明确的 Body 层级
          style={{ zIndex: 'var(--z-context-menu-body)' }}
          // 防止关闭时自动聚焦到触发器（由 Radix UI 自动处理）
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            // [Refactor] 使用统一的动画系统
            transition={SMOOTH_TRANSITION}
            className="liquidGlass-wrapper"
            style={{
              // [Refactor] Tokenized Radius
              borderRadius: 'var(--radius-lg)',
              // [Refactor] 使用标准菜单宽度 Token
              minWidth: 'var(--menu-min-width)',
            }}
          >
            <div className="liquidGlass-content p-1">
              <ul className="list-none m-0 p-0">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <ContextMenuPrimitive.Item
                      asChild
                      onSelect={(e) => {
                        e.preventDefault();
                        item.onClick();
                      }}
                    >
                      <button
                        className={`flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md transition-all ${
                          item.variant === 'destructive' ? 'hover-destructive' : 'hover-action'
                        }`}
                        style={{
                          // [Refactor] Tokenized Colors
                          color: item.variant === 'destructive'
                            ? 'var(--color-text-secondary)'
                            : 'var(--color-text-primary)',
                          background: 'transparent',
                          font: 'var(--font-caption)',
                          letterSpacing: 'var(--letter-spacing-caption)',
                          fontWeight: 500,
                        }}
                      >
                        {item.icon && React.cloneElement(item.icon as any, { className: 'icon-sm' })}
                        <span>{item.label}</span>
                      </button>
                    </ContextMenuPrimitive.Item>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}




