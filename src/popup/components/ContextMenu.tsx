import React, { ReactNode, useState, useRef } from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { motion } from 'framer-motion';
import { SMOOTH_TRANSITION } from '../utils/motion';
import { GlassCard } from './GlassCard';
import { useProgressiveEscape } from '@/hooks/useProgressiveEscape';
import { KeyboardShortcut } from './ui/KeyboardShortcut';

export type MenuElementType = 'item' | 'header' | 'divider' | 'search' | 'text';

export interface ContextMenuItem {
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  variant?: 'default' | 'destructive';
  /** 副标题文本 */
  description?: string;
  /** 快捷键字符串（如 "Meta+K" 或 "Ctrl+K"） */
  shortcut?: string;
  /** 右侧图标（如箭头） */
  rightIcon?: ReactNode;
  /** 选中状态（高亮显示） */
  isSelected?: boolean;
  /** 元素类型 */
  type?: MenuElementType;
  /** Header 专用：标题文本 */
  title?: string;
  /** Text 专用：文本内容 */
  content?: string;
}

interface ContextMenuProps {
  children: ReactNode;
  menuItems: ContextMenuItem[];
  className?: string;
}

// 菜单元素子组件
function DropdownHeader({ title }: { title: string }) {
  return (
    <div
      role="presentation"
      style={{
        padding: 'var(--space-2) var(--space-4)',
      }}
    >
      <p
        style={{
          font: 'var(--font-caption)',
          fontWeight: 500,
          letterSpacing: 'var(--letter-spacing-caption)',
          color: 'var(--color-text-secondary)',
          fontSize: '0.75rem',
          lineHeight: '1rem',
          textTransform: 'uppercase',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </p>
    </div>
  );
}

function DropdownDivider() {
  return (
    <div
      role="separator"
      style={{
        height: '1px',
        backgroundColor: 'var(--border-glass-subtle)',
        margin: 'var(--space-1) 0',
      }}
    />
  );
}

function DropdownText({ content }: { content: string }) {
  return (
    <div
      role="presentation"
      style={{
        padding: 'var(--space-2) var(--space-4)',
      }}
    >
      <p
        style={{
          font: 'var(--font-body)',
          letterSpacing: 'var(--letter-spacing-body)',
          color: 'var(--color-text-secondary)',
          fontSize: '0.875rem',
          lineHeight: '1.25rem',
          margin: 0,
        }}
      >
        {content}
      </p>
    </div>
  );
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
  ], { global: false });

  return (
    <ContextMenuPrimitive.Root onOpenChange={setIsOpen}>
      <ContextMenuPrimitive.Trigger asChild className={className}>
        {children}
      </ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
          // [Refactor] 使用明确的 Body 层级
          style={{ zIndex: 'var(--z-context-menu-body)' }}
          // 防止关闭时自动聚焦到触发器（由 Radix UI 自动处理）
          onCloseAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            // 与 Progressive Escape 集成：如果菜单打开，拦截 ESC 事件
            if (isOpen && handleEscape) {
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
                borderRadius: 'var(--radius-lg)',
                minWidth: 'var(--menu-min-width)',
                maxWidth: 'calc(100vw - var(--space-4))',
                maxHeight: 'calc(100vh - var(--space-4))',
                boxShadow: 'var(--shadow-md)',
                padding: 'var(--space-2) 0',
                overflow: 'hidden',
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
                {menuItems.map((item, index) => {
                  const elementType = item.type || 'item';

                  if (elementType === 'header') {
                    return (
                      <li key={index}>
                        <DropdownHeader title={item.title || item.label} />
                      </li>
                    );
                  }

                  if (elementType === 'divider') {
                    return (
                      <li key={index}>
                        <DropdownDivider />
                      </li>
                    );
                  }

                  if (elementType === 'text') {
                    return (
                      <li key={index}>
                        <DropdownText content={item.content || item.label} />
                      </li>
                    );
                  }

                  return (
                    <li key={index}>
                      <ContextMenuPrimitive.Item
                        asChild
                        onSelect={(e) => {
                          e.preventDefault();
                          if (item.onClick) {
                            item.onClick();
                          }
                        }}
                      >
                        <button
                          role="menuitem"
                          aria-keyshortcuts={item.shortcut}
                          aria-selected={item.isSelected}
                          className="flex items-center gap-2 w-full text-left transition-all"
                          style={{
                            padding: 'var(--space-2) var(--space-4)',
                            gap: 'var(--space-2)',
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            cursor: item.onClick ? 'pointer' : 'default',
                            color: item.isSelected
                              ? 'var(--c-action)'
                              : item.variant === 'destructive'
                              ? 'var(--color-text-secondary)'
                              : 'var(--color-text-primary)',
                            font: 'var(--font-list-item)',
                            letterSpacing: 'var(--letter-spacing-list-item)',
                            minWidth: 0,
                            overflow: 'hidden',
                          }}
                          onMouseEnter={(e) => {
                            if (item.onClick) {
                              e.currentTarget.style.background = 'var(--bg-surface-glass-hover)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {item.icon && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                width: 'var(--icon-size-base)',
                                height: 'var(--icon-size-base)',
                                color: 'inherit',
                              }}
                            >
                              {React.cloneElement(item.icon as any, {
                                className: 'icon-base',
                                style: { width: 'var(--icon-size-base)', height: 'var(--icon-size-base)' },
                              })}
                            </div>
                          )}

                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: item.description ? 'var(--space-0_5)' : 0,
                            }}
                          >
                            <span
                              style={{
                                font: 'inherit',
                                color: 'inherit',
                                fontSize: '0.875rem',
                                lineHeight: '1rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.label}
                            </span>
                            {item.description && (
                              <span
                                style={{
                                  font: 'var(--font-caption)',
                                  letterSpacing: 'var(--letter-spacing-caption)',
                                  color: 'var(--color-text-secondary)',
                                  fontSize: '0.75rem',
                                  lineHeight: '1rem',
                                }}
                              >
                                {item.description}
                              </span>
                            )}
                          </div>

                          {(item.shortcut || item.rightIcon) && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                flexShrink: 0,
                                gap: 'var(--space-2)',
                              }}
                            >
                              {item.rightIcon && (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 'var(--icon-size-base)',
                                    height: 'var(--icon-size-base)',
                                    color: 'var(--color-text-secondary)',
                                  }}
                                >
                                  {React.cloneElement(item.rightIcon as any, {
                                    className: 'icon-base',
                                    style: { width: 'var(--icon-size-base)', height: 'var(--icon-size-base)' },
                                  })}
                                </div>
                              )}
                              {item.shortcut && <KeyboardShortcut shortcut={item.shortcut} />}
                            </div>
                          )}
                        </button>
                      </ContextMenuPrimitive.Item>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          </motion.div>
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}




