import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { SMOOTH_TRANSITION } from '@/popup/utils/motion';

export interface StickyDropdownProps {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  zIndex?: string;
  offset?: { x: number; y: number };
}

/**
 * StickyDropdown Component
 * 
 * 使用 Direct DOM Manipulation 和事件驱动更新，避免 React 渲染周期开销。
 * 仅在 scroll/resize/open 时触发位置计算，移除死循环以降低 CPU 消耗。
 */
export function StickyDropdown({ 
  isOpen, 
  anchorRef, 
  children, 
  zIndex = "var(--z-dropdown)",
  offset = { x: 0, y: 0 }
}: StickyDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const updatePosition = () => {
      const dropdown = dropdownRef.current;
      const anchor = anchorRef.current;
      
      if (!dropdown || !anchor) return;

      const rect = anchor.getBoundingClientRect();
      const top = rect.bottom + offset.y;
      const left = rect.left + offset.x;
      const width = rect.width;

      dropdown.style.top = `${top}px`;
      dropdown.style.left = `${left}px`;
      dropdown.style.width = `${width}px`;
    };

    updatePosition();

    let rafId: number | null = null;
    const handleUpdate = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        updatePosition();
        rafId = null;
      });
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    const resizeObserver = new ResizeObserver(() => handleUpdate());
    resizeObserver.observe(anchorRef.current);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      resizeObserver.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isOpen, anchorRef, offset.x, offset.y]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, scale: 0.98, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -4 }}
          transition={SMOOTH_TRANSITION}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: zIndex,
            transformOrigin: 'top center',
            willChange: 'top, left, width',
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
