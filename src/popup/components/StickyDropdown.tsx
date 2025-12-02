import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SMOOTH_TRANSITION } from '../utils/motion';
import { DURATION } from '../../design-tokens/animation';

// ----------------------------------------------------------------
// 独立组件: 负责无延迟跟随的下拉菜单容器
// 使用 createPortal + 手动定位实现，跟随 anchor 元素位置
// ----------------------------------------------------------------
export interface StickyDropdownProps {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  zIndex?: string;
}

/**
 * StickyDropdown Component
 * 
 * 一个跟随 anchor 元素位置的下拉菜单组件
 * 使用 createPortal 渲染到 body，手动计算位置
 */
export function StickyDropdown({ 
  isOpen, 
  anchorRef, 
  children, 
  zIndex = "var(--z-dropdown)" 
}: StickyDropdownProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 延迟卸载以播放退出动画：使用 mounted 状态来延迟卸载，让 Framer Motion 的 exit 动画能够播放
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), DURATION.FAST * 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!mounted || !isOpen || !anchorRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!anchorRef.current) return;

      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();

    const handleUpdate = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    
    // 使用 requestAnimationFrame 循环更新以保持高性能
    let rafId: number;
    const loop = () => {
      updatePosition();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [mounted, isOpen, anchorRef]);

  if (!anchorRef.current || !mounted) {
    return null;
  }

  return typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>
      {mounted && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, scale: 0.98, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -4 }}
          // [Refactor] 使用统一的动画系统
          transition={SMOOTH_TRANSITION}
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
            zIndex: zIndex,
            transformOrigin: 'top center',
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  ) : null;
}
