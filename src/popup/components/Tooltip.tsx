import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { POSITIONING } from '../utils/layoutConstants';
import { SMOOTH_TRANSITION } from '../utils/motion'; // [Refactor] 使用统一的动画系统

interface TooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  side?: 'top' | 'bottom';
  delay?: number;
  disabled?: boolean;
}

export function Tooltip({ 
  children, 
  content, 
  side = 'top', 
  delay = 400, // 默认延迟，防止闪烁
  disabled = false 
}: TooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  // 智能定位逻辑
  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    // 1. 水平居中
    let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
    // [Refactor] 使用标准定位常量
    const safeMargin = POSITIONING.VIEWPORT_MARGIN;
    left = Math.max(safeMargin, Math.min(left, viewportWidth - tooltipRect.width - safeMargin));
    
    // [Refactor] 使用标准定位常量
    const offset = POSITIONING.TOOLTIP_OFFSET; 
    let top = 0;

    // 3. 垂直定位与自动翻转
    if (side === 'top') {
      top = triggerRect.top - tooltipRect.height - offset;
      if (top < safeMargin) top = triggerRect.bottom + offset;
    } else {
      top = triggerRect.bottom + offset;
    }
    
    setPosition({ top, left });
  }, [side]);

  useLayoutEffect(() => {
    if (show) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [show, content, updatePosition]);

  const handleMouseEnter = () => {
    if (disabled || !content) return;
    timerRef.current = setTimeout(() => setShow(true), delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShow(false);
  };

  // 劫持子组件以注入事件和 Ref
  const trigger = React.cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      // 使用类型断言来处理 ref
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
      const { ref } = children as any;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave();
      children.props.onMouseLeave?.(e);
    },
    onMouseDown: (e: React.MouseEvent) => {
      setShow(false); // 点击即消失
      children.props.onMouseDown?.(e);
    }
  });

  return (
    <>
      {trigger}
      {typeof document !== 'undefined' && !disabled && content && createPortal(
        <AnimatePresence>
          {show && (
            <motion.div
              ref={tooltipRef}
              initial={{ opacity: 0, scale: 0.96, y: side === 'top' ? 2 : -2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              // [Refactor] 使用统一的动画系统
              transition={SMOOTH_TRANSITION}
              className="fixed"
              style={{ 
                zIndex: 'var(--z-tooltip)',
                top: position.top, 
                left: position.left,
                pointerEvents: 'none'
              }}
            >
              <div className="frost-tooltip-content">
                {content}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

