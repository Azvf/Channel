import React, { ReactNode, useState, useRef } from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { motion } from 'framer-motion';
import { SMOOTH_TRANSITION } from '../utils/motion';
import { GlassCard } from './GlassCard';
import { useProgressiveEscape } from '@/hooks/useProgressiveEscape';

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
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Progressive Escape 支持：Level 1 - 关闭下拉菜单
  // 注意：Radix UI ContextMenu 已经处理了 ESC 键，我们通过 onEscapeKeyDown 集成 Progressive Escape
  const handleEscape = useProgressiveEscape([
    {
      id: 'context-menu',
      predicate: () => {
        // 检查菜单内容是否在 DOM 中（表示菜单打开）
        return contentRef.current !== null && document.contains(contentRef.current);
      },
      action: () => {
        // Radix UI 会在 onEscapeKeyDown 中处理关闭，这里只是标记状态
        setIsOpen(false);
      },
    },
  ]);

  return (
    <ContextMenuPrimitive.Root onOpenChange={setIsOpen}>
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
          onEscapeKeyDown={(e) => {
            // 与 Progressive Escape 集成：如果菜单打开，拦截 ESC 事件
            if (isOpen) {
              handleEscape(e as any);
            }
          }}
        >
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            // [Refactor] 使用统一的动画系统
            transition={SMOOTH_TRANSITION}
          >
            <GlassCard
              depthLevel={0}
              style={{
                // [Refactor] Tokenized Radius - 覆盖默认的 radius-xl
                borderRadius: 'var(--radius-lg)',
                // [Refactor] 使用标准菜单宽度 Token
                minWidth: 'var(--menu-min-width)',
              }}
            >
              <div
                style={{
                  // [Refactor] Tokenized Spacing
                  padding: 'var(--space-1)',
                }}
              >
                <ul
                  className="list-none m-0 p-0"
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                  }}
                >
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
                            // [Refactor] Tokenized Spacing
                            padding: 'var(--space-1_5) var(--space-3)',
                            gap: 'var(--space-2)',
                            borderRadius: 'var(--radius-sm)',
                            // [Refactor] Tokenized Colors
                            color: item.variant === 'destructive'
                              ? 'var(--color-text-secondary)'
                              : 'var(--color-text-primary)',
                            background: 'transparent',
                            font: 'var(--font-caption)',
                            letterSpacing: 'var(--letter-spacing-caption)',
                            fontWeight: 500,
                            outline: 'none',
                            border: 'none',
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
            </GlassCard>
          </motion.div>
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}




