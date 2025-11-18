import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
  const triggerRef = useRef<HTMLElement>(null);
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
    // 2. 边缘检测 (保持 8px 安全边距)
    left = Math.max(8, Math.min(left, viewportWidth - tooltipRect.width - 8));
    
    const offset = 6; // 使用 CSS 变量定义的距离
    let top = 0;

    // 3. 垂直定位与自动翻转
    if (side === 'top') {
      top = triggerRect.top - tooltipRect.height - offset;
      if (top < 8) top = triggerRect.bottom + offset; // 空间不足翻转到底部
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
      triggerRef.current = node;
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
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed z-[var(--z-tooltip-layer)]"
              style={{ top: position.top, left: position.left }}
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

