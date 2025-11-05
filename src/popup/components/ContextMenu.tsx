import React, { useState, MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
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
      className="fixed inset-0 z-[200]"
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
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed z-[201] liquidGlass-wrapper"
            style={{
              top: position.y,
              left: position.x,
              minWidth: '150px',
              borderRadius: '0.8em', // Slightly smaller radius for menu
            }}
          >
            <div className="liquidGlass-content p-1">
              <ul className="list-none m-0 p-0">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleItemClick(item.onClick)}
                      className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md transition-all"
                      style={{
                        color: 'var(--c-content)',
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'color-mix(in srgb, var(--c-action) 15%, transparent)';
                        e.currentTarget.style.color = 'var(--c-action)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--c-content)';
                      }}
                    >
                      {item.icon && React.cloneElement(item.icon as any, { className: 'w-3.5 h-3.5' })}
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




