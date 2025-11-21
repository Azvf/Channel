import React, { useState, MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Get position relative to the viewport
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleItemClick = (onClick: () => void) => {
    onClick();
    closeMenu();
  };

  const menuElement = (
    <div
      className="fixed inset-0"
      // [Refactor] 使用明确的 Backdrop 层级
      style={{ zIndex: 'var(--z-context-menu-backdrop)' }}
      onClick={closeMenu}
      onContextMenu={(e) => {
        e.preventDefault();
        closeMenu();
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            // [Refactor] 使用统一的动画系统
            transition={SMOOTH_TRANSITION}
            className="fixed liquidGlass-wrapper"
            style={{
              // [Refactor] 使用明确的 Body 层级，替代 calc(+1)
              zIndex: 'var(--z-context-menu-body)',
              top: position.y,
              left: position.x,
              // [Refactor] 使用标准菜单宽度 Token
              minWidth: 'var(--menu-min-width)',
              // [Refactor] Tokenized Radius
              borderRadius: 'var(--radius-lg)', 
            }}
          >
            <div className="liquidGlass-content p-1">
              <ul className="list-none m-0 p-0">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleItemClick(item.onClick)}
                      className={`flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md transition-all ${item.variant === 'destructive' ? 'hover-destructive' : 'hover-action'}`}
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
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div onContextMenu={handleContextMenu} className={className}>
      {children}
      {isOpen && createPortal(menuElement, document.body)}
    </div>
  );
}




